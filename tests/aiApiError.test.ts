import assert from 'node:assert/strict'
import test from 'node:test'
import OpenAI from 'openai'
import { serviceError } from '../src/ai/vitePlugin.ts'

function upstream429(code: string | null, type?: string) {
  return OpenAI.APIError.generate(
    429,
    { error: { code, type, message: 'Upstream detail stays on the server' } },
    undefined,
    new Headers(),
  )
}

test('explains OpenAI credit and spend limit errors without calling them temporary rate limits', () => {
  const credits = serviceError(upstream429('credit_balance_exhausted', 'insufficient_quota'))
  assert.equal(credits.status, 429)
  assert.equal(credits.code, 'credit_balance_exhausted')
  assert.match(credits.message, /Add credits/)
  assert.doesNotMatch(credits.message, /Upstream detail/)

  const spend = serviceError(upstream429('project_spend_limit_exceeded', 'insufficient_quota'))
  assert.equal(spend.code, 'project_spend_limit_exceeded')
  assert.match(spend.message, /spend limit/)

  const legacyQuota = serviceError(upstream429(null, 'insufficient_quota'))
  assert.equal(legacyQuota.code, 'insufficient_quota')
  assert.match(legacyQuota.message, /waiting alone will not restore access/)
})

test('explains a temporary rate limit and leaves an unknown 429 uncertain', () => {
  const rate = serviceError(upstream429('rate_limit_exceeded', 'rate_limit_error'))
  assert.equal(rate.status, 429)
  assert.match(rate.message, /Wait before trying again/)

  const unknown = serviceError(upstream429(null))
  assert.equal(unknown.code, undefined)
  assert.match(unknown.message, /credits, spend limits, and request rate/)
})
