import assert from 'node:assert/strict'
import test from 'node:test'
import { parseCompactResponse } from '../src/meta/compactResponse.ts'
import { normalizeChampionAnalysis, OpggMetaProvider } from '../src/meta/opgg.ts'

const compactAnalysis = `class LolGetChampionAnalysis: champion,position,data
class Data: summary,core_items,boots,fourth_items,weak_counters
class Summary: average_stats,positions
class AverageStats: play,win_rate,pick_rate,ban_rate,tier
class Position: name,stats
class Stats: play,win_rate,pick_rate,role_rate,ban_rate
class CoreItems: ids,ids_names,play,win,pick_rate
class Counter: champion_name,play,my_win_rate

LolGetChampionAnalysis("BRAND","MID",Data(Summary(AverageStats(38096,0.49,0.04,0.03,5),[Position("MID",Stats(6070,0.49,0.01,0.16,0.03))]),CoreItems([2503,3116,6653],["Blackfire Torch","Rylai's Crystal Scepter","Liandry's Torment"],563,306,0.16),CoreItems([3020],["Sorcerer's Shoes"],4048,1978,0.73),[CoreItems([3157],["Zhonya's Hourglass"],368,181,0.26)],[Counter("Ekko",104,0.37)]))`

test('parses OP.GG compact MCP data into the provider model', () => {
  const raw = parseCompactResponse(compactAnalysis)
  const meta = normalizeChampionAnalysis(raw, 'mid', '2026-09-28T12:00:00.000Z')
  assert.equal(meta.champion, 'BRAND')
  assert.equal(meta.roleStats?.games, 6070)
  assert.deepEqual(meta.coreBuilds[0].ids, [2503, 3116, 6653])
  assert.equal(meta.fourthItems[0].names[0], "Zhonya's Hourglass")
  assert.equal(meta.weakAgainst[0].winRate, 0.37)
})

test('reuses champion/role results and retries after an OP.GG error', async () => {
  let requests = 0
  let fail = false
  const fakeFetch = (async (_url: string | URL | Request, init?: RequestInit): Promise<Response> => {
    requests++
    const method = JSON.parse(String(init?.body)).method as string
    if (method === 'initialize') {
      return new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result: { protocolVersion: '2025-06-18' } }), {
        headers: { 'content-type': 'application/json', 'mcp-session-id': 'test-session' },
      })
    }
    return new Response(JSON.stringify({
      jsonrpc: '2.0', id: 2,
      result: fail
        ? { isError: true, content: [{ type: 'text', text: 'Unavailable' }] }
        : { content: [{ type: 'text', text: compactAnalysis }] },
    }), { headers: { 'content-type': 'application/json' } })
  }) as typeof fetch

  let now = Date.parse('2026-09-28T12:00:00.000Z')
  const provider = new OpggMetaProvider(fakeFetch, () => now)
  const first = await provider.getChampionMeta('Brand', 'mid')
  const second = await provider.getChampionMeta('brand', 'mid')
  assert.equal(first, second)
  assert.equal(requests, 2)

  now += 30 * 60 * 1000 + 1
  fail = true
  await assert.rejects(provider.getChampionMeta('Brand', 'mid'), /analysis failed/)
  assert.equal(requests, 4)

  fail = false
  const recovered = await provider.getChampionMeta('Brand', 'mid')
  assert.equal(recovered.champion, 'BRAND')
  assert.equal(requests, 6)
})

test('rejects malformed compact data instead of exposing partial meta', () => {
  assert.throws(() => parseCompactResponse('LolGetChampionAnalysis("BRAND")'), /unknown response format/)
})
