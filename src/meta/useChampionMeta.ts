import { useEffect, useState } from 'react'
import type { GameState } from '../types/gameState'
import { metaProvider } from './httpProvider'
import { roleFromPosition } from './role'
import type { ChampionMeta } from './types'

export type MetaStatus =
  | { kind: 'idle' }
  | { kind: 'loading'; key: string }
  | { kind: 'ready'; key: string; meta: ChampionMeta }
  | { kind: 'error'; key: string; message: string }

export function useChampionMeta(game: GameState | null): { status: MetaStatus; retry: () => void } {
  const champion = game?.player.champion?.id || game?.player.championName || ''
  const role = roleFromPosition(game?.player.position ?? null)
  const key = champion && role ? `${champion.toUpperCase()}:${role}` : null
  const [state, setState] = useState<MetaStatus>({ kind: 'idle' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!key || !role) return
    let active = true
    setState({ kind: 'loading', key })
    void metaProvider.getChampionMeta(champion, role)
      .then((meta) => { if (active) setState({ kind: 'ready', key, meta }) })
      .catch((error: unknown) => {
        if (active) setState({
          kind: 'error', key,
          message: error instanceof Error ? error.message : 'Unknown error',
        })
      })
    return () => { active = false }
  }, [champion, role, key, attempt])

  // A champion/source switch must not briefly expose the previous champion's meta.
  const status: MetaStatus = !key ? { kind: 'idle' }
    : state.kind !== 'idle' && state.key === key ? state : { kind: 'loading', key }
  return { status, retry: () => setAttempt((value) => value + 1) }
}
