import type { GameState } from '../types/gameState'
import { readLiveClientGame } from './liveClient'
import { toGameState } from './toGameState'

/** The app-facing League reader: raw Riot data stays inside src/league. */
export async function readGameState(signal?: AbortSignal): Promise<GameState | null> {
  const raw = await readLiveClientGame(signal)
  return raw === null ? null : toGameState(raw)
}
