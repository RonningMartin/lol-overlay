import { useState } from 'react'
import { requestRecommendation } from '../ai/httpClient'
import type { RecommendationContext } from '../recommendations/contextTypes'
import type { RecommendationResult } from '../recommendations/recommendationResult'

type RequestState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'success'; result: RecommendationResult; timeSeconds: number }
  | { kind: 'error'; message: string }

export function AiRecommendationDebug({ context }: { context: RecommendationContext }) {
  const [state, setState] = useState<RequestState>({ kind: 'idle' })

  async function generate() {
    const snapshot = context
    setState({ kind: 'loading' })
    try {
      const result = await requestRecommendation(snapshot)
      setState({ kind: 'success', result, timeSeconds: snapshot.game.timeSeconds })
    } catch (error) {
      setState({ kind: 'error', message: error instanceof Error ? error.message : 'Recommendation failed.' })
    }
  }

  return (
    <section className="ai-panel" aria-label="OpenAI recommendation test">
      <p className="section-label">Step 9 · manual AI test</p>
      <h2>OpenAI recommendation</h2>
      <p className="muted">
        Sends the current Step 7 context shown above to the local service when you click. Each click can use API credits.
      </p>
      <p className="muted">
        Context: {context.player.champion.name} · {context.player.role ?? 'unknown role'} ·
        {' '}{context.enemies.length} enemies · {context.itemCatalog.length} catalog items ·
        {' '}{context.meta ? 'OP.GG meta available' : 'OP.GG meta unavailable'}
      </p>
      <button className="ai-generate" type="button" disabled={state.kind === 'loading'} onClick={() => void generate()}>
        {state.kind === 'loading' ? 'Generating…' : 'Generate recommendation'}
      </button>
      {state.kind === 'loading' && <p role="status">Waiting for OpenAI…</p>}
      {state.kind === 'error' && <p className="ai-error" role="alert">{state.message}</p>}
      {state.kind === 'success' && (
        <div className="ai-result" role="status">
          <p>Validated result for {state.result.champion} · game time {Math.floor(state.timeSeconds / 60)}:{String(Math.floor(state.timeSeconds % 60)).padStart(2, '0')}</p>
          <pre>{JSON.stringify(state.result, null, 2)}</pre>
        </div>
      )}
    </section>
  )
}
