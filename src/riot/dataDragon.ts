import type { ChampionDetails, ItemDetails, ItemReference } from '../types/gameState'

const DATA_DRAGON = 'https://ddragon.leagueoflegends.com'
const VERSIONS_URL = `${DATA_DRAGON}/api/versions.json`
const LOCALE = 'en_US'

export interface RiotDataCatalog {
  version: string
  items: Map<number, ItemDetails>
  championsByKey: Map<string, ChampionDetails>
  championsByName: Map<string, ChampionDetails>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function requireData(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value) || !isRecord(value.data)) {
    throw new Error(`Invalid Data Dragon ${label} response.`)
  }
  return value.data
}

function normalizeChampionName(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/gi, '').toLowerCase()
}

function imageUrl(version: string, group: 'item' | 'champion', file: string): string {
  return `${DATA_DRAGON}/cdn/${version}/img/${group}/${encodeURIComponent(file)}`
}

function plainDescription(value: string): string {
  const entities: Record<string, string> = {
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: "'",
    nbsp: ' ',
    '#39': "'",
  }

  return value
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&([a-z]+|#39);/gi, (match, name: string) => entities[name.toLowerCase()] ?? match)
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function numericStatMap(value: unknown): Record<string, number> {
  if (!isRecord(value)) return {}

  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, number] =>
      typeof entry[1] === 'number' && Number.isFinite(entry[1]),
    ),
  )
}

function numberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function itemReference(idValue: unknown, data: Record<string, unknown>, version: string): ItemReference | null {
  const id = Number(idValue)
  if (!Number.isInteger(id) || id < 0) return null

  const entry = data[String(id)]
  const name = isRecord(entry) && typeof entry.name === 'string' ? entry.name : `Item ${id}`
  const file = isRecord(entry) && isRecord(entry.image) && typeof entry.image.full === 'string'
    ? entry.image.full
    : null

  return { id, name, iconUrl: file ? imageUrl(version, 'item', file) : null }
}

function buildPath(value: unknown, data: Record<string, unknown>, version: string): ItemReference[] {
  if (!Array.isArray(value)) return []
  return value
    .map((id) => itemReference(id, data, version))
    .filter((item): item is ItemReference => item !== null)
}

export function parseDataDragonCatalog(
  version: string,
  itemResponse: unknown,
  championResponse: unknown,
): RiotDataCatalog {
  const itemData = requireData(itemResponse, 'item')
  const championData = requireData(championResponse, 'champion')
  const items = new Map<number, ItemDetails>()
  const championsByKey = new Map<string, ChampionDetails>()
  const championsByName = new Map<string, ChampionDetails>()

  for (const [key, value] of Object.entries(itemData)) {
    const id = Number(key)
    if (!Number.isInteger(id) || !isRecord(value) || typeof value.name !== 'string') continue

    const gold = isRecord(value.gold) ? value.gold : {}
    const image = isRecord(value.image) ? value.image : {}
    const file = typeof image.full === 'string' ? image.full : null

    items.set(id, {
      id,
      name: value.name,
      iconUrl: file ? imageUrl(version, 'item', file) : null,
      price: {
        base: numberOrNull(gold.base),
        total: numberOrNull(gold.total),
        sell: numberOrNull(gold.sell),
        purchasable: typeof gold.purchasable === 'boolean' ? gold.purchasable : null,
      },
      description: typeof value.description === 'string' ? plainDescription(value.description) : '',
      stats: numericStatMap(value.stats),
      buildsFrom: buildPath(value.from, itemData, version),
      buildsInto: buildPath(value.into, itemData, version),
    })
  }

  for (const value of Object.values(championData)) {
    if (!isRecord(value) || typeof value.id !== 'string' || typeof value.name !== 'string') continue
    const numericId = Number(value.key)
    if (!Number.isInteger(numericId)) continue

    const image = isRecord(value.image) ? value.image : {}
    const file = typeof image.full === 'string' ? image.full : null
    const champion: ChampionDetails = {
      id: value.id,
      numericId,
      name: value.name,
      iconUrl: file ? imageUrl(version, 'champion', file) : null,
    }

    championsByKey.set(normalizeChampionName(value.id), champion)
    championsByName.set(normalizeChampionName(value.name), champion)
  }

  if (items.size === 0 || championsByKey.size === 0) {
    throw new Error('Data Dragon returned no usable item or champion data.')
  }

  return { version, items, championsByKey, championsByName }
}

export function findChampion(
  catalog: RiotDataCatalog,
  championKey: string | null,
  championName: string,
): ChampionDetails | null {
  const byKey = championKey && catalog.championsByKey.get(normalizeChampionName(championKey))
  return byKey || catalog.championsByName.get(normalizeChampionName(championName)) || null
}

/** Keeps the version list and each patch's data in memory for this app session. */
export class DataDragonClient {
  private versionRequest: Promise<string> | null = null
  private catalogRequests = new Map<string, Promise<RiotDataCatalog>>()

  constructor(private readonly fetcher: typeof fetch = (input, init) => fetch(input, init)) {}

  private async fetchJson(url: string): Promise<unknown> {
    const response = await this.fetcher(url)
    if (!response.ok) throw new Error(`Data Dragon request failed: ${response.status}`)
    return response.json() as Promise<unknown>
  }

  private currentVersion(): Promise<string> {
    if (!this.versionRequest) {
      this.versionRequest = this.fetchJson(VERSIONS_URL)
        .then((versions) => {
          if (!Array.isArray(versions) || typeof versions[0] !== 'string') {
            throw new Error('Data Dragon returned no current version.')
          }
          return versions[0]
        })
        .catch((error: unknown) => {
          this.versionRequest = null
          throw error
        })
    }
    return this.versionRequest
  }

  async loadCurrent(): Promise<RiotDataCatalog> {
    const version = await this.currentVersion()
    let request = this.catalogRequests.get(version)

    if (!request) {
      const base = `${DATA_DRAGON}/cdn/${version}/data/${LOCALE}`
      request = Promise.all([
        this.fetchJson(`${base}/item.json`),
        this.fetchJson(`${base}/champion.json`),
      ])
        .then(([items, champions]) => parseDataDragonCatalog(version, items, champions))
        .catch((error: unknown) => {
          this.catalogRequests.delete(version)
          throw error
        })
      this.catalogRequests.set(version, request)
    }

    return request
  }
}

export const dataDragon = new DataDragonClient()
