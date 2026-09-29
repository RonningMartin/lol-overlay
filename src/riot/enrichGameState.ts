import type { GameState, PlayerState } from '../types/gameState'
import { findChampion, type RiotDataCatalog } from './dataDragon'

/** Attach current static details without changing the live GameState or catalog. */
export function enrichGameState(game: GameState, catalog: RiotDataCatalog): GameState {
  const enrichedPlayers = new Map<PlayerState, PlayerState>()

  function enrichPlayer(player: PlayerState): PlayerState {
    const cached = enrichedPlayers.get(player)
    if (cached) return cached

    const enriched: PlayerState = {
      ...player,
      champion: findChampion(catalog, player.championKey, player.championName),
      items: player.items.map((item) => ({
        ...item,
        details: catalog.items.get(item.id) ?? null,
      })),
    }
    enrichedPlayers.set(player, enriched)
    return enriched
  }

  return {
    ...game,
    staticDataVersion: catalog.version,
    player: enrichPlayer(game.player),
    allies: game.allies.map(enrichPlayer),
    enemies: game.enemies.map(enrichPlayer),
    teams: game.teams.map((team) => ({
      ...team,
      players: team.players.map(enrichPlayer),
    })),
  }
}
