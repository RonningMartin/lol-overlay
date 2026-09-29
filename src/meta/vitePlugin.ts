import type { Plugin, PreviewServer, ViteDevServer } from 'vite'
import { opggMetaProvider } from './opgg.ts'
import type { MetaRole } from './types.ts'

const roles: MetaRole[] = ['top', 'jungle', 'mid', 'adc', 'support', 'all']

export function metaApiPlugin(): Plugin {
  function register(server: ViteDevServer | PreviewServer) {
    server.middlewares.use((req, res, next) => {
      const url = new URL(req.url ?? '/', 'http://localhost')
      if (url.pathname !== '/api/meta/champion') return next()
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.setHeader('Cache-Control', 'no-store')
      if (req.method !== 'GET') {
        res.statusCode = 405
        res.end(JSON.stringify({ error: 'Method not allowed' }))
        return
      }

      const champion = url.searchParams.get('champion')?.trim() ?? ''
      const role = url.searchParams.get('role')?.toLowerCase() as MetaRole | undefined
      if (!/^[\p{L}0-9 .'_-]{1,40}$/u.test(champion) || !role || !roles.includes(role)) {
        res.statusCode = 400
        res.end(JSON.stringify({ error: 'A valid champion and role are required' }))
        return
      }

      void opggMetaProvider.getChampionMeta(champion, role)
        .then((meta) => res.end(JSON.stringify(meta)))
        .catch((error: unknown) => {
          res.statusCode = 502
          res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'OP.GG is unavailable' }))
        })
    })
  }

  return {
    name: 'local-meta-api',
    configureServer: register,
    configurePreviewServer: register,
  }
}
