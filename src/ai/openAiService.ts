import OpenAI from 'openai'
import { zodTextFormat } from 'openai/helpers/zod'
import type { RecommendationContext } from '../recommendations/contextTypes.ts'
import { buildRecommendationPrompt } from '../recommendations/recommendationPrompt.ts'
import {
  RecommendationResultSchema, type RecommendationResult,
} from '../recommendations/recommendationResult.ts'

export const DEFAULT_OPENAI_MODEL = 'gpt-5.4-mini'

export class InvalidRecommendationError extends Error {
  constructor() {
    super('OpenAI did not return a valid three-item recommendation. Please try again.')
    this.name = 'InvalidRecommendationError'
  }
}

/** This module runs on the local server only; the browser never imports the SDK or API key. */
export async function generateRecommendation(
  context: RecommendationContext,
  apiKey: string,
  model = DEFAULT_OPENAI_MODEL,
  client = new OpenAI({ apiKey, timeout: 60_000, maxRetries: 0 }),
): Promise<RecommendationResult> {
  const prompt = buildRecommendationPrompt(context)
  const response = await client.responses.parse({
    model,
    input: [
      { role: 'developer', content: prompt.instructions },
      { role: 'user', content: prompt.contextJson },
    ],
    text: { format: zodTextFormat(RecommendationResultSchema, 'recommendation_result') },
    store: false,
  })

  // Structured output constrains the response, but the Step 8 runtime contract
  // remains the final authority (including refinements not expressed in JSON Schema).
  const parsed = RecommendationResultSchema.safeParse(response.output_parsed)
  if (!parsed.success) throw new InvalidRecommendationError()
  return parsed.data
}
