import assert from 'node:assert/strict'
import test from 'node:test'
import { mockGameState } from '../src/dev/mockGameState.ts'
import { toGameState } from '../src/league/toGameState.ts'
import type { LiveClientGameData } from '../src/league/liveClient.ts'

const rawGame: LiveClientGameData = {
  activePlayer: {
    riotId: 'Player One#TEST',
    summonerName: 'Player One',
    level: 9,
    currentGold: 1250,
  },
  gameData: { gameTime: 932, gameMode: 'CLASSIC', mapName: 'Map11' },
  allPlayers: [
    {
      riotId: 'Player One#TEST',
      summonerName: 'Player One',
      championName: 'Brand',
      rawChampionName: 'game_character_displayname_Brand',
      level: 8,
      team: 'ORDER',
      position: 'MIDDLE',
      items: [{ itemID: 6653, displayName: "Liandry's Torment", count: 1, slot: 0 }],
      scores: { kills: 3, deaths: 2, assists: 5, creepScore: 120 },
    },
    {
      riotId: 'Player Two#TEST',
      championName: 'Nami',
      level: 8,
      team: 'ORDER',
      items: [],
      scores: { kills: 0, deaths: 3, assists: 8, creepScore: 12 },
    },
    {
      riotId: 'Player Three#TEST',
      championName: 'Aatrox',
      level: 10,
      team: 'CHAOS',
      items: [{ itemID: 3071, displayName: 'Black Cleaver', count: 1, slot: 1 }],
      scores: { kills: 4, deaths: 1, assists: 2, creepScore: 138 },
    },
  ],
}

test('converts Riot match data into app-owned players, items, and teams', () => {
  const input = structuredClone(rawGame)
  const game = toGameState(input)

  assert.equal(game.gameTime, 932)
  assert.equal(game.gameMode, 'CLASSIC')
  assert.equal(game.currentGold, 1250)
  assert.equal(game.player.championName, 'Brand')
  assert.equal(game.player.championKey, 'Brand')
  assert.equal(game.player.level, 9)
  assert.deepEqual(game.player.items, [
    { id: 6653, name: "Liandry's Torment", count: 1, slot: 0, details: null },
  ])
  assert.equal(game.player.kills, 3)
  assert.equal(game.player.creepScore, 120)
  assert.deepEqual(game.allies.map((player) => player.championName), ['Brand', 'Nami'])
  assert.deepEqual(game.enemies.map((player) => player.championName), ['Aatrox'])
  assert.deepEqual(game.teams.map((team) => [team.id, team.players.length]), [
    ['ORDER', 2],
    ['CHAOS', 1],
  ])
  assert.equal(input.allPlayers[0].level, 8)
})

test('matches older Live Client responses by summoner name', () => {
  const input = structuredClone(rawGame)
  delete input.activePlayer.riotId
  delete input.activePlayer.currentGold
  delete input.allPlayers[0].riotId

  const game = toGameState(input)
  assert.equal(game.player.name, 'Player One')
  assert.equal(game.currentGold, null)
})

test('rejects a response whose active player is missing from the player list', () => {
  const input = structuredClone(rawGame)
  input.activePlayer.riotId = 'Missing#TEST'
  delete input.activePlayer.summonerName

  assert.throws(() => toGameState(input), /active player was not found/)
})

test('sample GameState keeps the player inside the ally team', () => {
  assert.equal(mockGameState.player, mockGameState.allies[0])
  assert.equal(mockGameState.teams[0].players.length, mockGameState.allies.length)
})
