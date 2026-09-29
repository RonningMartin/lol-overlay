import assert from 'node:assert/strict'
import test from 'node:test'
import { mockGameState } from '../src/dev/mockGameState.ts'
import { toGameState } from '../src/league/toGameState.ts'
import type { LiveClientGameData } from '../src/league/liveClient.ts'
import type { ChampionMeta } from '../src/meta/types.ts'
import { buildRecommendationContext } from '../src/recommendations/buildRecommendationContext.ts'
import type { RiotDataCatalog } from '../src/riot/dataDragon.ts'
import type { ItemDetails } from '../src/types/gameState.ts'

const liandry: ItemDetails = {
  id: 6653, name: "Liandry's Torment", iconUrl: 'https://example.test/icon.png',
  price: { base: 800, total: 3000, sell: 2100, purchasable: true },
  description: 'Damaging abilities burn enemies.\n  Useful over time.',
  stats: { FlatMagicDamageMod: 60, FlatHPPoolMod: 300 },
  buildsFrom: [{ id: 3802, name: 'Lost Chapter', iconUrl: null }],
  buildsInto: [],
}

const catalog: RiotDataCatalog = {
  version: 'test-patch',
  items: new Map([
    [6653, liandry],
    [2503, {
      ...liandry, id: 2503, name: 'Blackfire Torch',
      description: 'Burns targets.', price: { ...liandry.price, total: 2800 },
    }],
  ]),
  championsByKey: new Map([['brand', {
    id: 'Brand', numericId: 63, name: 'Brand', iconUrl: 'https://example.test/brand.png',
  }]]),
  championsByName: new Map(),
}

const emptyStats = {
  winRate: 0.49, pickRate: 0.01, banRate: 0.03, games: 6070, roleRate: 0.16, tier: null,
}

const brandMeta: ChampionMeta = {
  source: 'OP.GG MCP', champion: 'BRAND', role: 'mid', gameMode: 'ranked',
  fetchedAt: '2026-09-28T12:00:00.000Z', overallStats: emptyStats, roleStats: emptyStats,
  coreBuilds: [{ ids: [2503, 6653], names: ['Blackfire Torch', "Liandry's Torment"], pickRate: 0.16, games: 563, wins: 306 }],
  boots: [], fourthItems: [], fifthItems: [], sixthItems: [],
  strongAgainst: [], weakAgainst: [{ champion: 'Ekko', games: 104, winRate: 0.37 }],
}

test('builds a compact context from sample GameState without optional sources', () => {
  const context = buildRecommendationContext(mockGameState, null, null)
  assert.equal(context.schemaVersion, 1)
  assert.equal(context.game.timeSeconds, 1475)
  assert.equal(context.player.champion.name, 'Brand')
  assert.equal(context.player.role, 'mid')
  assert.equal(context.player.gold, 2450)
  assert.deepEqual(context.allies.map((ally) => ally.champion.name), ['Nami'])
  assert.deepEqual(context.enemies.map((enemy) => enemy.champion.name), ['Aatrox', 'Jinx'])
  assert.equal(context.meta, null)
  assert.equal(context.itemCatalog.length, 5)
  const serialized = JSON.stringify(context)
  assert.equal(serialized.includes('Example Brand'), false)
  assert.equal(serialized.includes('iconUrl'), false)
  assert.equal(serialized.includes('teams'), false)
})

test('adds Riot item mechanics and matching OP.GG builds once per item', () => {
  const original = JSON.stringify(mockGameState)
  const context = buildRecommendationContext(mockGameState, catalog, brandMeta)
  assert.equal(context.game.riotDataVersion, 'test-patch')
  assert.deepEqual(context.player.champion, { name: 'Brand', id: 'Brand', numericId: 63 })
  assert.deepEqual(context.meta?.coreBuilds[0].itemIds, [2503, 6653])
  assert.deepEqual(context.meta?.matchups.weakAgainst[0], {
    opponent: 'Ekko', playerWinRate: 0.37, games: 104,
  })
  assert.equal(context.itemCatalog.filter((item) => item.id === 6653).length, 1)
  assert.equal(context.itemCatalog.find((item) => item.id === 2503)?.totalCost, 2800)
  assert.equal(context.itemCatalog.find((item) => item.id === 6653)?.description,
    'Damaging abilities burn enemies. Useful over time.')
  assert.equal(context.itemCatalog.find((item) => item.id === 6653)?.stats.abilityPower, 60)
  assert.deepEqual(context.itemCatalog.find((item) => item.id === 6653)?.buildsFrom,
    [{ id: 3802, name: 'Lost Chapter' }])
  assert.equal(JSON.stringify(mockGameState), original)
})

test('does not include stale meta for another champion or role', () => {
  const context = buildRecommendationContext(mockGameState, null, { ...brandMeta, role: 'support' })
  assert.equal(context.meta, null)
  assert.equal(context.itemCatalog.some((item) => item.id === 2503), false)
})

test('rounds live time and gold down to useful whole values', () => {
  const context = buildRecommendationContext({
    ...mockGameState, gameTime: 1475.8, currentGold: 2450.9,
  }, null, null)
  assert.equal(context.game.timeSeconds, 1475)
  assert.equal(context.player.gold, 2450)
})

test('accepts GameState converted from a live-client response', () => {
  const raw: LiveClientGameData = {
    activePlayer: { riotId: 'Player#TEST', level: 9 },
    gameData: { gameTime: 932, gameMode: 'CLASSIC', mapName: 'Map11' },
    allPlayers: [
      {
        riotId: 'Player#TEST', championName: 'Brand', level: 9, team: 'ORDER',
        position: 'MIDDLE', items: [{ itemID: 6653, displayName: "Liandry's Torment", count: 1, slot: 0 }],
        scores: { kills: 3, deaths: 2, assists: 5, creepScore: 120 },
      },
      {
        riotId: 'Enemy#TEST', championName: 'Aatrox', level: 10, team: 'CHAOS',
        position: 'TOP', items: [{ itemID: 3071, displayName: 'Black Cleaver', count: 1, slot: 0 }],
        scores: { kills: 4, deaths: 1, assists: 2, creepScore: 138 },
      },
    ],
  }
  const context = buildRecommendationContext(toGameState(raw), catalog, brandMeta)
  assert.equal(context.player.gold, null)
  assert.equal(context.player.level, 9)
  assert.equal(context.enemies[0].items[0].id, 3071)
  assert.equal(context.meta?.role, 'mid')
})
