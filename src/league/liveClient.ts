// These fields mirror Riot's Live Client Data response. Keep Riot-specific
// naming here; toGameState.ts converts it for the rest of the application.
export interface LiveClientItem {
  itemID: number
  displayName: string
  count: number
  slot: number
}

export interface LiveClientScores {
  kills: number
  deaths: number
  assists: number
  creepScore: number
}

export interface LiveClientPlayer {
  riotId?: string
  summonerName?: string
  championName: string
  rawChampionName?: string
  level: number
  team: string
  position?: string
  items: LiveClientItem[]
  scores: LiveClientScores
}

export interface LiveClientGameData {
  activePlayer: {
    riotId?: string
    summonerName?: string
    level: number
    currentGold?: number
  }
  allPlayers: LiveClientPlayer[]
  gameData: {
    gameTime: number
    gameMode?: string
    mapName?: string
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isLiveClientItem(value: unknown): value is LiveClientItem {
  return (
    isRecord(value) &&
    typeof value.itemID === 'number' &&
    typeof value.displayName === 'string' &&
    typeof value.count === 'number' &&
    typeof value.slot === 'number'
  )
}

function isLiveClientPlayer(value: unknown): value is LiveClientPlayer {
  return (
    isRecord(value) &&
    (value.riotId === undefined || typeof value.riotId === 'string') &&
    (value.summonerName === undefined || typeof value.summonerName === 'string') &&
    typeof value.championName === 'string' &&
    (value.rawChampionName === undefined || typeof value.rawChampionName === 'string') &&
    typeof value.level === 'number' &&
    typeof value.team === 'string' &&
    (value.position === undefined || typeof value.position === 'string') &&
    Array.isArray(value.items) &&
    value.items.every(isLiveClientItem) &&
    isRecord(value.scores) &&
    typeof value.scores.kills === 'number' &&
    typeof value.scores.deaths === 'number' &&
    typeof value.scores.assists === 'number' &&
    typeof value.scores.creepScore === 'number'
  )
}

function isLiveClientGameData(value: unknown): value is LiveClientGameData {
  if (!isRecord(value) || !isRecord(value.activePlayer) || !isRecord(value.gameData)) {
    return false
  }

  return (
    (value.activePlayer.riotId === undefined || typeof value.activePlayer.riotId === 'string') &&
    (value.activePlayer.summonerName === undefined ||
      typeof value.activePlayer.summonerName === 'string') &&
    typeof value.activePlayer.level === 'number' &&
    (value.activePlayer.currentGold === undefined ||
      typeof value.activePlayer.currentGold === 'number') &&
    typeof value.gameData.gameTime === 'number' &&
    (value.gameData.gameMode === undefined || typeof value.gameData.gameMode === 'string') &&
    (value.gameData.mapName === undefined || typeof value.gameData.mapName === 'string') &&
    Array.isArray(value.allPlayers) &&
    value.allPlayers.every(isLiveClientPlayer)
  )
}

export async function readLiveClientGame(signal?: AbortSignal): Promise<LiveClientGameData | null> {
  let response: Response

  try {
    // Vite proxies this local path to the game's HTTPS endpoint in dev/preview.
    response = await fetch('/liveclientdata/allgamedata', { signal })
  } catch {
    return null
  }

  // The game process is only expected to serve this endpoint during a match.
  if (!response.ok) {
    return null
  }

  const data: unknown = await response.json()
  if (!isLiveClientGameData(data)) {
    throw new Error('The Live Client Data response has an unexpected shape.')
  }

  return data
}
