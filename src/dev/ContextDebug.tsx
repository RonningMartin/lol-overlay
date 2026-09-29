import type { RecommendationContext } from '../recommendations/contextTypes'

export function ContextDebug({ context, metaState }: {
  context: RecommendationContext
  metaState: 'loading' | 'ready' | 'unavailable'
}) {
  return (
    <section className="context-panel" aria-label="Recommendation context preview">
      <p className="section-label">Step 7 · context preview</p>
      <h2>Prepared match context</h2>
      <p className="muted">
        Exact structured object sent when you manually generate a recommendation below. Inspecting it makes no request.
      </p>
      <div className="context-summary">
        <span>{context.player.champion.name} {context.player.role?.toUpperCase() || 'role unknown'}</span>
        <span>{context.allies.length} other allies · {context.enemies.length} enemies</span>
        <span>{context.itemCatalog.length} resolved/referenced items</span>
        <span>Riot: {context.game.riotDataVersion || 'unavailable'} · OP.GG: {metaState}</span>
      </div>
      <details className="context-inspector">
        <summary>Inspect exact recommendation context JSON</summary>
        <pre>{JSON.stringify(context, null, 2)}</pre>
      </details>
    </section>
  )
}
