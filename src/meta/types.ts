export type MetaRole = 'top' | 'jungle' | 'mid' | 'adc' | 'support' | 'all'

export interface MetaItemGroup {
  ids: number[]
  names: string[]
  pickRate: number | null
  games: number | null
  wins: number | null
}

export interface MetaStats {
  winRate: number | null
  pickRate: number | null
  banRate: number | null
  games: number | null
  roleRate: number | null
  tier: number | null
}

export interface MetaMatchup {
  champion: string
  games: number | null
  winRate: number | null
}

export interface ChampionMeta {
  source: 'OP.GG MCP'
  champion: string
  role: MetaRole
  gameMode: 'ranked'
  fetchedAt: string
  overallStats: MetaStats
  roleStats: MetaStats | null
  coreBuilds: MetaItemGroup[]
  boots: MetaItemGroup[]
  fourthItems: MetaItemGroup[]
  fifthItems: MetaItemGroup[]
  sixthItems: MetaItemGroup[]
  strongAgainst: MetaMatchup[]
  weakAgainst: MetaMatchup[]
}

export interface MetaProvider {
  getChampionMeta(champion: string, role: MetaRole): Promise<ChampionMeta>
}
