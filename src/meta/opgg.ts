import { parseCompactResponse } from './compactResponse.ts'
import type { ChampionMeta, MetaItemGroup, MetaMatchup, MetaProvider, MetaRole, MetaStats } from './types.ts'

const ENDPOINT = 'https://mcp-api.op.gg/mcp'
const CACHE_MS = 30 * 60 * 1000

// Every field here is listed in the live input schema for lol_get_champion_analysis.
const OUTPUT_FIELDS = [
  'champion',
  'position',
  'data.summary.average_stats.{win_rate,pick_rate,ban_rate,play,tier}',
  'data.summary.positions[].name',
  'data.summary.positions[].stats.{win_rate,pick_rate,ban_rate,play,role_rate}',
  'data.core_items.{ids[],ids_names[],pick_rate,play,win}',
  'data.boots.{ids[],ids_names[],pick_rate,play,win}',
  'data.fourth_items[].{ids[],ids_names[],pick_rate,play,win}',
  'data.fifth_items[].{ids[],ids_names[],pick_rate,play,win}',
  'data.sixth_items[].{ids[],ids_names[],pick_rate,play,win}',
  'data.strong_counters[].{champion_name,my_win_rate,play}',
  'data.weak_counters[].{champion_name,my_win_rate,play}',
]

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown> : {}
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : value == null ? [] : [value]
}

function numberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function stats(value: unknown): MetaStats {
  const data = record(value)
  return {
    winRate: numberOrNull(data.win_rate),
    pickRate: numberOrNull(data.pick_rate),
    banRate: numberOrNull(data.ban_rate),
    games: numberOrNull(data.play),
    roleRate: numberOrNull(data.role_rate),
    tier: numberOrNull(data.tier),
  }
}

function itemGroups(value: unknown): MetaItemGroup[] {
  return list(value).map((entry) => {
    const data = record(entry)
    return {
      ids: list(data.ids).filter((id): id is number => typeof id === 'number'),
      names: list(data.ids_names).filter((name): name is string => typeof name === 'string'),
      pickRate: numberOrNull(data.pick_rate),
      games: numberOrNull(data.play),
      wins: numberOrNull(data.win),
    }
  }).filter((group) => group.ids.length > 0 || group.names.length > 0)
}

function matchups(value: unknown): MetaMatchup[] {
  return list(value).map((entry) => {
    const data = record(entry)
    return {
      champion: typeof data.champion_name === 'string' ? data.champion_name : '',
      games: numberOrNull(data.play),
      winRate: numberOrNull(data.my_win_rate),
    }
  }).filter((matchup) => matchup.champion)
}

export function normalizeChampionAnalysis(raw: Record<string, unknown>, role: MetaRole, fetchedAt: string): ChampionMeta {
  const data = record(raw.data)
  const summary = record(data.summary)
  const champion = raw.champion
  if (typeof champion !== 'string' || !champion || !raw.data || !summary.average_stats) {
    throw new Error('OP.GG champion analysis is missing required data')
  }

  const roleEntry = list(summary.positions).map(record)
    .find((entry) => String(entry.name).toLowerCase() === role)

  return {
    source: 'OP.GG MCP',
    champion,
    role,
    gameMode: 'ranked',
    fetchedAt,
    overallStats: stats(summary.average_stats),
    roleStats: roleEntry ? stats(roleEntry.stats) : null,
    coreBuilds: itemGroups(data.core_items),
    boots: itemGroups(data.boots),
    fourthItems: itemGroups(data.fourth_items),
    fifthItems: itemGroups(data.fifth_items),
    sixthItems: itemGroups(data.sixth_items),
    strongAgainst: matchups(data.strong_counters),
    weakAgainst: matchups(data.weak_counters),
  }
}

function asRpcResult(value: unknown): Record<string, unknown> {
  const response = record(value)
  if (response.error) {
    const error = record(response.error)
    throw new Error(typeof error.message === 'string' ? error.message : 'OP.GG MCP returned an error')
  }
  if (!response.result) throw new Error('OP.GG MCP returned no result')
  return record(response.result)
}

export class OpggMetaProvider implements MetaProvider {
  private readonly cache = new Map<string, { expiresAt: number; promise: Promise<ChampionMeta> }>()

  constructor(private readonly fetchFn: typeof fetch = fetch, private readonly now: () => number = Date.now) {}

  getChampionMeta(champion: string, role: MetaRole): Promise<ChampionMeta> {
    const normalizedChampion = champion.trim().replace(/([a-z])([A-Z])/g, '$1_$2')
      .replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '').toUpperCase()
    if (!normalizedChampion) return Promise.reject(new Error('A champion is required'))
    const key = `${normalizedChampion}:${role}`
    const cached = this.cache.get(key)
    if (cached && cached.expiresAt > this.now()) return cached.promise

    const promise = this.fetchAnalysis(normalizedChampion, role)
      .catch((error: unknown) => {
        if (this.cache.get(key)?.promise === promise) this.cache.delete(key)
        throw error
      })
    this.cache.set(key, { expiresAt: this.now() + CACHE_MS, promise })
    return promise
  }

  private async post(body: Record<string, unknown>, sessionId?: string): Promise<Record<string, unknown>> {
    const response = await this.fetchFn(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
        'MCP-Protocol-Version': '2025-06-18',
        ...(sessionId ? { 'Mcp-Session-Id': sessionId } : {}),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(12000),
    })
    if (!response.ok) throw new Error(`OP.GG MCP returned HTTP ${response.status}`)
    const contentType = response.headers.get('content-type') ?? ''
    if (!contentType.includes('application/json')) {
      throw new Error('OP.GG MCP returned an unsupported transport response')
    }
    return { ...asRpcResult(await response.json()), sessionId: response.headers.get('mcp-session-id') }
  }

  private async fetchAnalysis(champion: string, role: MetaRole): Promise<ChampionMeta> {
    const initialized = await this.post({
      jsonrpc: '2.0', id: 1, method: 'initialize',
      params: {
        protocolVersion: '2025-06-18', capabilities: {},
        clientInfo: { name: 'league-item-advisor', version: '0.1.0' },
      },
    })
    const sessionId = initialized.sessionId
    if (typeof sessionId !== 'string') throw new Error('OP.GG MCP did not provide a session')

    const result = await this.post({
      jsonrpc: '2.0', id: 2, method: 'tools/call',
      params: {
        name: 'lol_get_champion_analysis',
        arguments: {
          game_mode: 'ranked', champion, position: role,
          lang: 'en_US', desired_output_fields: OUTPUT_FIELDS,
        },
      },
    }, sessionId)

    if (result.isError) throw new Error('OP.GG champion analysis failed')
    const content = list(result.content).map(record)
    const text = content.find((entry) => entry.type === 'text')?.text
    if (typeof text !== 'string') throw new Error('OP.GG returned no champion analysis')
    return normalizeChampionAnalysis(parseCompactResponse(text), role, new Date(this.now()).toISOString())
  }
}

export const opggMetaProvider: MetaProvider = new OpggMetaProvider()
