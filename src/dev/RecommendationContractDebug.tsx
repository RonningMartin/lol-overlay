import { mockRecommendationResult } from './mockRecommendationResult'
import type { RecommendationContext } from '../recommendations/contextTypes'
import { buildRecommendationPrompt } from '../recommendations/recommendationPrompt'
import { RecommendationResultSchema } from '../recommendations/recommendationResult'

export function RecommendationContractDebug({ context }: { context: RecommendationContext }) {
  const validation = RecommendationResultSchema.safeParse(mockRecommendationResult)
  const prompt = buildRecommendationPrompt(context)

  return (
    <section className="contract-panel" aria-label="Recommendation result contract preview">
      <p className="section-label">Step 8 · output contract</p>
      <h2>Structured recommendation preview</h2>
      <p className="muted">
        Static Brand healing scenario for schema testing. This result is illustrative, not generated from the match above.
      </p>
      <p className={validation.success ? 'contract-valid' : 'contract-invalid'} role="status">
        Mock schema validation: {validation.success ? 'valid · 3 distinct items' : 'invalid'}
      </p>
      {!validation.success && (
        <ul className="contract-errors">
          {validation.error.issues.map((issue, index) => (
            <li key={index}>{issue.path.join('.') || 'result'}: {issue.message}</li>
          ))}
        </ul>
      )}
      <details className="contract-inspector">
        <summary>Inspect mock RecommendationResult JSON</summary>
        <pre>{JSON.stringify(mockRecommendationResult, null, 2)}</pre>
      </details>
      <details className="contract-inspector">
        <summary>Inspect model instructions</summary>
        <p className="muted">Instruction message:</p>
        <pre>{prompt.instructions}</pre>
        <p className="muted">Context message: the exact Step 7 context JSON above ({prompt.contextJson.length} characters).</p>
      </details>
    </section>
  )
}
