import assert from 'node:assert/strict'
import test from 'node:test'
import OpenAI from 'openai'
import { mockGameState } from '../src/dev/mockGameState.ts'
import { mockRecommendationResult } from '../src/dev/mockRecommendationResult.ts'
import { generateRecommendation, InvalidRecommendationError } from '../src/ai/openAiService.ts'
import { buildRecommendationContext } from '../src/recommendations/buildRecommendationContext.ts'
import { buildRecommendationPrompt } from '../src/recommendations/recommendationPrompt.ts'

const context = buildRecommendationContext(mockGameState, null, null)

function fakeClient(output: unknown, capture: (request: unknown) => void = () => {}): OpenAI {
  return {
    responses: {
      parse: async (request: unknown) => {
        capture(request)
        return { output_parsed: output }
      },
    },
  } as unknown as OpenAI
}

test('sends Step 7 context and Step 8 schema through the Responses API', async () => {
  let request: unknown
  const result = await generateRecommendation(
    context, 'test-key', 'gpt-5.4-mini', fakeClient(mockRecommendationResult, (value) => { request = value }),
  )
  assert.deepEqual(result, mockRecommendationResult)
  assert.ok(request && typeof request === 'object')
  const sent = request as {
    model: string
    input: Array<{ role: string; content: string }>
    text: { format: { type: string; strict: boolean; schema: { properties: object; additionalProperties: boolean } } }
    store: boolean
  }
  assert.equal(sent.model, 'gpt-5.4-mini')
  assert.equal(sent.input[0].role, 'developer')
  assert.equal(sent.input[0].content, buildRecommendationPrompt(context).instructions)
  assert.equal(sent.input[1].content, JSON.stringify(context))
  assert.equal(sent.text.format.type, 'json_schema')
  assert.equal(sent.text.format.strict, true)
  assert.equal(sent.text.format.schema.additionalProperties, false)
  assert.deepEqual(Object.keys(sent.text.format.schema.properties), ['champion', 'recommendedItems', 'summary'])
  assert.equal(sent.store, false)
})

test('rejects a missing or structurally invalid model result safely', async () => {
  const invalidResults = [
    null,
    { ...mockRecommendationResult, recommendedItems: mockRecommendationResult.recommendedItems.slice(0, 2) },
    {
      ...mockRecommendationResult,
      recommendedItems: [mockRecommendationResult.recommendedItems[0], mockRecommendationResult.recommendedItems[0], mockRecommendationResult.recommendedItems[2]],
    },
  ]
  for (const output of invalidResults) {
    await assert.rejects(
      generateRecommendation(context, 'test-key', 'gpt-5.4-mini', fakeClient(output)),
      InvalidRecommendationError,
    )
  }
})

test('the official SDK parses a structured response through a local fake transport', async () => {
  let sentBody: unknown
  const client = new OpenAI({
    apiKey: 'test-key',
    maxRetries: 0,
    fetch: async (_url, init) => {
      sentBody = JSON.parse(String(init?.body)) as unknown
      return new Response(JSON.stringify({
        id: 'resp_test',
        object: 'response',
        created_at: 0,
        status: 'completed',
        model: 'gpt-5.4-mini',
        output: [{
          id: 'msg_test',
          type: 'message',
          role: 'assistant',
          status: 'completed',
          content: [{ type: 'output_text', text: JSON.stringify(mockRecommendationResult), annotations: [] }],
        }],
      }), { status: 200, headers: { 'content-type': 'application/json' } })
    },
  })
  const result = await generateRecommendation(context, 'test-key', 'gpt-5.4-mini', client)
  assert.deepEqual(result, mockRecommendationResult)
  assert.ok(sentBody && typeof sentBody === 'object')
  const body = sentBody as { text: { format: { name: string; strict: boolean } } }
  assert.equal(body.text.format.name, 'recommendation_result')
  assert.equal(body.text.format.strict, true)
})
