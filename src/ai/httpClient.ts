import type { RecommendationContext } from '../recommendations/contextTypes'
import {
  RecommendationResultSchema, type RecommendationResult,
} from '../recommendations/recommendationResult'

/** The browser sends only Step 7 context to the local service, never credentials. */
export async function requestRecommendation(context: RecommendationContext): Promise<RecommendationResult> {
  let response: Response
  try {
    response = await fetch('/api/ai/recommendation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ context }),
    })
  } catch {
    throw new Error('The local AI service is unavailable. Start the app with npm run dev or npm run preview.')
  }

  let body: unknown
  try {
    body = await response.json()
  } catch {
    throw new Error(`The local AI service returned an unreadable response (HTTP ${response.status}).`)
  }

  if (!response.ok) {
    const message = body && typeof body === 'object' && 'error' in body && typeof body.error === 'string'
      ? body.error : `Recommendation request failed (HTTP ${response.status}).`
    const code = body && typeof body === 'object' && 'code' in body && typeof body.code === 'string' &&
      /^[a-z0-9_]{1,80}$/i.test(body.code) ? body.code : null
    throw new Error(code ? `${message} (code: ${code})` : message)
  }

  const parsed = RecommendationResultSchema.safeParse(body)
  if (!parsed.success) throw new Error('The local AI service returned an invalid recommendation.')
  return parsed.data
}
