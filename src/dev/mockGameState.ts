import type { GameState, PlayerState } from '../types/gameState'

const brand: PlayerState = {
  name: 'Example Brand',
  championName: 'Brand',
  championKey: 'Brand',
  champion: null,
  level: 13,
  team: 'ORDER',
  position: 'MIDDLE',
  items: [
    { id: 6653, name: "Liandry's Torment", count: 1, slot: 0, details: null },
    { id: 3020, name: "Sorcerer's Shoes", count: 1, slot: 1, details: null },
  ],
  kills: 5,
  deaths: 3,
  assists: 8,
  creepScore: 178,
}

const nami: PlayerState = {
  name: 'Example Nami',
  championName: 'Nami',
  championKey: 'Nami',
  champion: null,
  level: 11,
  team: 'ORDER',
  position: 'UTILITY',
  items: [{ id: 3870, name: 'Dream Maker', count: 1, slot: 0, details: null }],
  kills: 1,
  deaths: 4,
  assists: 15,
  creepScore: 24,
}

const aatrox: PlayerState = {
  name: 'Example Aatrox',
  championName: 'Aatrox',
  championKey: 'Aatrox',
  champion: null,
  level: 14,
  team: 'CHAOS',
  position: 'TOP',
  items: [{ id: 3071, name: 'Black Cleaver', count: 1, slot: 0, details: null }],
  kills: 7,
  deaths: 2,
  assists: 4,
  creepScore: 190,
}

const jinx: PlayerState = {
  name: 'Example Jinx',
  championName: 'Jinx',
  championKey: 'Jinx',
  champion: null,
  level: 12,
  team: 'CHAOS',
  position: 'BOTTOM',
  items: [{ id: 3031, name: 'Infinity Edge', count: 1, slot: 0, details: null }],
  kills: 6,
  deaths: 5,
  assists: 6,
  creepScore: 165,
}

export const mockGameState: GameState = {
  gameTime: 24 * 60 + 35,
  gameMode: 'CLASSIC',
  mapName: "Summoner's Rift",
  staticDataVersion: null,
  currentGold: 2450,
  player: brand,
  allies: [brand, nami],
  enemies: [aatrox, jinx],
  teams: [
    { id: 'ORDER', players: [brand, nami] },
    { id: 'CHAOS', players: [aatrox, jinx] },
  ],
}
