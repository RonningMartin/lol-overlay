/** App-owned match data. Components and later stages should use these types. */
export interface ItemReference {
  id: number
  name: string
  iconUrl: string | null
}

export interface ItemDetails {
  id: number
  name: string
  iconUrl: string | null
  price: {
    base: number | null
    total: number | null
    sell: number | null
    purchasable: boolean | null
  }
  description: string
  stats: Record<string, number>
  buildsFrom: ItemReference[]
  buildsInto: ItemReference[]
}

export interface ItemState {
  id: number
  name: string
  count: number
  slot: number
  details: ItemDetails | null
}

export interface ChampionDetails {
  id: string
  numericId: number
  name: string
  iconUrl: string | null
}

export interface PlayerState {
  name: string
  championName: string
  championKey: string | null
  champion: ChampionDetails | null
  level: number
  team: string
  position: string | null
  items: ItemState[]
  kills: number
  deaths: number
  assists: number
  creepScore: number
}

export interface TeamState {
  id: string
  players: PlayerState[]
}

export interface GameState {
  gameTime: number
  gameMode: string | null
  mapName: string | null
  staticDataVersion: string | null
  currentGold: number | null
  player: PlayerState
  /** Includes the current player. */
  allies: PlayerState[]
  enemies: PlayerState[]
  teams: TeamState[]
}
