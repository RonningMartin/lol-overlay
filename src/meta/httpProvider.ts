import type { ChampionMeta, MetaProvider, MetaRole } from './types'

/** Browser-facing provider; OP.GG MCP details remain on the local Vite server. */
export const metaProvider: MetaProvider = {
  async getChampionMeta(champion: string, role: MetaRole): Promise<ChampionMeta> {
    const query = new URLSearchParams({ champion, role })
    const response = await fetch(`/api/meta/champion?${query}`, { cache: 'no-store' })
    const body: unknown = await response.json()
    if (!response.ok) {
      const message = body && typeof body === 'object' && 'error' in body && typeof body.error === 'string'
        ? body.error : `Meta request failed (HTTP ${response.status})`
      throw new Error(message)
    }
    return body as ChampionMeta
  },
}
