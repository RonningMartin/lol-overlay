import assert from 'node:assert/strict'
import test from 'node:test'
import { mockGameState } from '../src/dev/mockGameState.ts'
import { DataDragonClient, findChampion } from '../src/riot/dataDragon.ts'
import { enrichGameState } from '../src/riot/enrichGameState.ts'

const version = '99.1.2'
const items = {
  data: {
    '6653': {
      name: "Liandry's Torment",
      image: { full: '6653.png' },
      gold: { base: 800, total: 3000, sell: 2100, purchasable: true },
      description: '<mainText><stats>60 Ability Power<br>300 Health</stats><br><passive>Torment</passive> Damage over time &amp; more.',
      stats: { FlatHPPoolMod: 300, FlatMagicDamageMod: 60 },
      from: ['3147', '2508'],
    },
    '3147': { name: 'Haunting Guise', image: { full: '3147.png' } },
    '2508': { name: 'Fated Ashes', image: { full: '2508.png' } },
    '3020': { name: "Sorcerer's Shoes", image: { full: '3020.png' } },
    '1001': { name: 'Boots', into: ['3020'] },
  },
}
const champions = {
  data: {
    Brand: { id: 'Brand', key: '63', name: 'Brand', image: { full: 'Brand.png' } },
    TwistedFate: { id: 'TwistedFate', key: '4', name: 'Twisted Fate', image: { full: 'TwistedFate.png' } },
  },
}

function fakeFetcher(requested: string[]): typeof fetch {
  return (async (input: RequestInfo | URL) => {
    const url = String(input)
    requested.push(url)
    const body = url.endsWith('/api/versions.json') ? [version]
      : url.endsWith('/item.json') ? items
      : url.endsWith('/champion.json') ? champions
      : null
    return new Response(JSON.stringify(body), { status: body === null ? 404 : 200 })
  }) as typeof fetch
}

test('loads the latest reported patch once and resolves Riot item/champion fields', async () => {
  const requested: string[] = []
  const client = new DataDragonClient(fakeFetcher(requested))
  const [catalog, sameCatalog] = await Promise.all([client.loadCurrent(), client.loadCurrent()])
  assert.equal(catalog, sameCatalog)
  assert.equal(await client.loadCurrent(), catalog)
  assert.equal(requested.length, 3)
  assert.ok(requested.some((url) => url.includes(`/cdn/${version}/data/en_US/item.json`)))

  const liandry = catalog.items.get(6653)
  assert.equal(liandry?.name, "Liandry's Torment")
  assert.equal(liandry?.price.total, 3000)
  assert.equal(liandry?.price.base, 800)
  assert.equal(liandry?.iconUrl, `https://ddragon.leagueoflegends.com/cdn/${version}/img/item/6653.png`)
  assert.equal(liandry?.description.includes('<'), false)
  assert.match(liandry?.description ?? '', /Damage over time & more/)
  assert.deepEqual(liandry?.stats, { FlatHPPoolMod: 300, FlatMagicDamageMod: 60 })
  assert.deepEqual(liandry?.buildsFrom.map((part) => part.name), ['Haunting Guise', 'Fated Ashes'])
  assert.deepEqual(catalog.items.get(1001)?.buildsInto.map((part) => part.name), ["Sorcerer's Shoes"])

  const champion = findChampion(catalog, 'TwistedFate', 'Twisted Fate')
  assert.equal(champion?.id, 'TwistedFate')
  assert.equal(champion?.numericId, 4)
  assert.equal(champion?.iconUrl, `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/TwistedFate.png`)
})

test('enriches GameState while preserving the original live/sample objects', async () => {
  const catalog = await new DataDragonClient(fakeFetcher([])).loadCurrent()
  const game = enrichGameState(mockGameState, catalog)

  assert.equal(game.staticDataVersion, version)
  assert.equal(game.player.champion?.numericId, 63)
  assert.equal(game.player.items[0].details?.price.total, 3000)
  assert.equal(game.player, game.allies[0])
  assert.equal(game.player, game.teams[0].players[0])
  assert.equal(game.allies[1].champion, null)
  assert.equal(mockGameState.staticDataVersion, null)
  assert.equal(mockGameState.player.items[0].details, null)
})
