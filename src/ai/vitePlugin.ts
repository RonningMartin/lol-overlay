import type { IncomingMessage, ServerResponse } from 'node:http'
import { loadEnv, type Plugin, type PreviewServer, type ViteDevServer } from 'vite'
import { z } from 'zod'
import { generateRecommendation, InvalidRecommendationError } from './openAiService.ts'
import type { RecommendationContext } from '../recommendations/contextTypes.ts'

const MAX_REQUEST_BYTES = 512 * 1024

// The browser builds the full typed context. The local endpoint checks its
// essential envelope before passing it to the model and caps request size.
const requestSchema = z.strictObject({
  context: z.object({
    schemaVersion: z.literal(1),
    game: z.object({ timeSeconds: z.number().finite() }).passthrough(),
    player: z.object({
      champion: z.object({ name: z.string().min(1) }).passthrough(),
      items: z.array(z.object({ id: z.number().int(), count: z.number().int() }).passthrough()),
    }).passthrough(),
    allies: z.array(z.unknown()),
    enemies: z.array(z.unknown()),
    itemCatalog: z.array(z.unknown()),
    meta: z.unknown().nullable(),
  }).passthrough(),
})

function sendJson(res: ServerResponse, status: number, value: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.end(JSON.stringify(value))
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  let bytes = 0
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array)
    bytes += buffer.length
    if (bytes > MAX_REQUEST_BYTES) throw new Error('Request is too large.')
    chunks.push(buffer)
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown
}

export function serviceError(error: unknown): { status: number; message: string; code?: string } {
  if (error instanceof InvalidRecommendationError || error instanceof z.ZodError || error instanceof SyntaxError) {
    return { status: 502, message: 'OpenAI returned an invalid recommendation. Please try again.' }
  }
  const status = error && typeof error === 'object' && 'status' in error ? error.status : null
  const code = error && typeof error === 'object' && 'code' in error && typeof error.code === 'string' &&
    /^[a-z0-9_]{1,80}$/i.test(error.code) ? error.code : null
  const type = error && typeof error === 'object' && 'type' in error ? error.type : null
  if (status === 401) return { status: 502, message: 'OpenAI rejected the API key. Check OPENAI_API_KEY in .env.' }
  if (status === 429) {
    if (code === 'credit_balance_exhausted') {
      return { status: 429, code, message: 'OpenAI API credits are exhausted. Add credits in your OpenAI Platform billing settings before retrying.' }
    }
    if (code === 'organization_spend_limit_exceeded' || code === 'project_spend_limit_exceeded') {
      return { status: 429, code, message: 'OpenAI API spend limit reached. Check your organization or project limit in OpenAI Platform settings.' }
    }
    if (code === 'organization_usage_limit_exceeded') {
      return { status: 429, code, message: 'OpenAI API organization usage limit reached. Check your OpenAI Platform usage limits.' }
    }
    if (code === 'insufficient_quota' || type === 'insufficient_quota') {
      return { status: 429, code: code ?? 'insufficient_quota', message: 'OpenAI API quota is unavailable. Check API credits and spend limits; waiting alone will not restore access.' }
    }
    if (code === 'rate_limit_exceeded' || code === 'slow_down') {
      return { status: 429, code, message: 'OpenAI request rate limit reached. Wait before trying again; follow Retry-After if the API provided it.' }
    }
    return { status: 429, code: code ?? undefined, message: 'OpenAI returned HTTP 429. Check API credits, spend limits, and request rate in OpenAI Platform.' }
  }
  if (status === 400 || status === 404) {
    return { status: 502, message: 'OpenAI rejected the request. Check OPENAI_MODEL and the server log.' }
  }
  return { status: 502, message: 'OpenAI is unavailable. Check your connection and the server log.' }
}

/** Local-only API, mounted in both Vite dev and preview; no secret reaches React. */
export function aiApiPlugin(): Plugin {
  function register(server: ViteDevServer | PreviewServer) {
    const env = loadEnv(server.config.mode, server.config.root, 'OPENAI_')
    const apiKey = process.env.OPENAI_API_KEY?.trim() || env.OPENAI_API_KEY?.trim()
    const model = process.env.OPENAI_MODEL?.trim() || env.OPENAI_MODEL?.trim() || undefined

    server.middlewares.use((req, res, next) => {
      const url = new URL(req.url ?? '/', 'http://localhost')
      if (url.pathname !== '/api/ai/recommendation') return next()
      if (req.method !== 'POST') {
        sendJson(res, 405, { error: 'Method not allowed.' })
        return
      }

      // A foreign website must not be able to spend the user's local API key.
      const origin = req.headers.origin
      const host = req.headers.host
      let hostname = ''
      try { if (host) hostname = new URL(`http://${host}`).hostname } catch { /* reject malformed Host */ }
      const loopbackHost = ['127.0.0.1', 'localhost', '[::1]'].includes(hostname)
      const loopbackClient = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress ?? '')
      if (!loopbackHost || !loopbackClient || !origin || origin !== `http://${host}`) {
        sendJson(res, 403, { error: 'This endpoint accepts same-origin requests only.' })
        return
      }
      if (!req.headers['content-type']?.startsWith('application/json')) {
        sendJson(res, 415, { error: 'Send JSON with Content-Type: application/json.' })
        return
      }
      if (!apiKey) {
        sendJson(res, 503, { error: 'OpenAI API key is missing. Add OPENAI_API_KEY to .env and restart the local server.' })
        return
      }

      void (async () => {
        let body: unknown
        try {
          body = await readJson(req)
        } catch (error) {
          const message = error instanceof Error && error.message === 'Request is too large.'
            ? 'Recommendation context is too large.' : 'Invalid JSON request body.'
          sendJson(res, message.includes('too large') ? 413 : 400, { error: message })
          return
        }
        const parsed = requestSchema.safeParse(body)
        if (!parsed.success) {
          sendJson(res, 400, { error: 'A valid Step 7 recommendation context is required.' })
          return
        }

        try {
          const result = await generateRecommendation(parsed.data.context as unknown as RecommendationContext, apiKey, model)
          sendJson(res, 200, result)
        } catch (error) {
          const failure = serviceError(error)
          sendJson(res, failure.status, { error: failure.message, code: failure.code })
        }
      })()
    })
  }

  return {
    name: 'local-ai-api',
    configureServer: register,
    configurePreviewServer: register,
  }
}
