import type { MetaRole } from '../meta/types'

export interface ContextChampion {
  name: string
  id: string | null
  numericId: number | null
}

export interface ContextInventoryItem {
  id: number
  count: number
}

export interface ContextPlayer {
  champion: ContextChampion
  role: MetaRole | null
  level: number
  items: ContextInventoryItem[]
  kills: number
  deaths: number
  assists: number
  creepScore: number
}

export interface ContextCurrentPlayer extends ContextPlayer {
  gold: number | null
}

export interface ContextItem {
  id: number
  name: string
  totalCost: number | null
  description: string | null
  stats: Record<string, number>
  buildsFrom: Array<{ id: number; name: string }>
}

export interface ContextMetaItemGroup {
  itemIds: number[]
  pickRate: number | null
  games: number | null
}

export interface ContextMetaStats {
  winRate: number | null
  pickRate: number | null
  banRate: number | null
  games: number | null
  roleRate: number | null
  tier: number | null
}

export interface ContextMatchup {
  opponent: string
  playerWinRate: number | null
  games: number | null
}

export interface ContextMeta {
  source: string
  fetchedAt: string
  role: MetaRole
  gameMode: string
  overallStats: ContextMetaStats
  roleStats: ContextMetaStats | null
  coreBuilds: ContextMetaItemGroup[]
  boots: ContextMetaItemGroup[]
  laterItems: {
    fourth: ContextMetaItemGroup[]
    fifth: ContextMetaItemGroup[]
    sixth: ContextMetaItemGroup[]
  }
  matchups: {
    strongAgainst: ContextMatchup[]
    weakAgainst: ContextMatchup[]
  }
}

/** Exact, serializable data prepared for a later AI integration. */
export interface RecommendationContext {
  schemaVersion: 1
  game: {
    timeSeconds: number
    mode: string | null
    map: string | null
    riotDataVersion: string | null
  }
  player: ContextCurrentPlayer
  /** Other allied players; the current player is not repeated here. */
  allies: ContextPlayer[]
  enemies: ContextPlayer[]
  /** One entry per referenced item, shared by inventories and OP.GG builds. */
  itemCatalog: ContextItem[]
  meta: ContextMeta | null
}
