import assert from 'node:assert/strict'
import test from 'node:test'
import { mockGameState } from '../src/dev/mockGameState.ts'
import { mockRecommendationResult } from '../src/dev/mockRecommendationResult.ts'
import { buildRecommendationContext } from '../src/recommendations/buildRecommendationContext.ts'
import { buildRecommendationPrompt } from '../src/recommendations/recommendationPrompt.ts'
import {
  MAX_REASON_LENGTH, MAX_SUMMARY_LENGTH, RecommendationResultSchema,
} from '../src/recommendations/recommendationResult.ts'

test('Brand healing mock matches the successful result contract', () => {
  const parsed = RecommendationResultSchema.safeParse(mockRecommendationResult)
  assert.equal(parsed.success, true)
  if (!parsed.success) return
  assert.equal(parsed.data.recommendedItems.length, 3)
  assert.deepEqual(parsed.data.recommendedItems.map((item) => item.itemId), [3165, 2503, 3116])
})

test('requires exactly three distinct item IDs', () => {
  const two = { ...mockRecommendationResult, recommendedItems: mockRecommendationResult.recommendedItems.slice(0, 2) }
  const four = {
    ...mockRecommendationResult,
    recommendedItems: [...mockRecommendationResult.recommendedItems, {
      ...mockRecommendationResult.recommendedItems[0], itemId: 3157,
    }],
  }
  const duplicate = {
    ...mockRecommendationResult,
    recommendedItems: [
      mockRecommendationResult.recommendedItems[0],
      mockRecommendationResult.recommendedItems[0],
      mockRecommendationResult.recommendedItems[2],
    ],
  }
  assert.equal(RecommendationResultSchema.safeParse(two).success, false)
  assert.equal(RecommendationResultSchema.safeParse(four).success, false)
  assert.equal(RecommendationResultSchema.safeParse(duplicate).success, false)
})

test('rejects extra fields, invalid IDs and priorities, and long or multiline copy', () => {
  const item = mockRecommendationResult.recommendedItems[0]
  const variants: unknown[] = [
    { ...mockRecommendationResult, explanation: 'Extra field' },
    { ...mockRecommendationResult, recommendedItems: [{ ...item, extra: true }, ...mockRecommendationResult.recommendedItems.slice(1)] },
    { ...mockRecommendationResult, recommendedItems: [{ ...item, itemId: 3.5 }, ...mockRecommendationResult.recommendedItems.slice(1)] },
    { ...mockRecommendationResult, recommendedItems: [{ ...item, priority: 'URGENT' }, ...mockRecommendationResult.recommendedItems.slice(1)] },
    { ...mockRecommendationResult, recommendedItems: [{ ...item, reason: 'x'.repeat(MAX_REASON_LENGTH + 1) }, ...mockRecommendationResult.recommendedItems.slice(1)] },
    { ...mockRecommendationResult, recommendedItems: [{ ...item, reason: 'Two\nlines' }, ...mockRecommendationResult.recommendedItems.slice(1)] },
    { ...mockRecommendationResult, summary: 'x'.repeat(MAX_SUMMARY_LENGTH + 1) },
  ]
  for (const variant of variants) {
    assert.equal(RecommendationResultSchema.safeParse(variant).success, false)
  }
})

test('future prompt contains the exact Step 7 context and explicit output constraints', () => {
  const context = buildRecommendationContext(mockGameState, null, null)
  const prompt = buildRecommendationPrompt(context)
  assert.equal(prompt.contextJson, JSON.stringify(context))
  assert.match(prompt.instructions, /OP\.GG meta as the current baseline/)
  assert.match(prompt.instructions, /enemy champions and their reported items/)
  assert.match(prompt.instructions, /exactly three distinct/)
  assert.match(prompt.instructions, /Do not invent item IDs/)
  assert.match(prompt.instructions, /Return only a JSON object/)
})
