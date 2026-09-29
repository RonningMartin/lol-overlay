import type { GameState, ItemState, PlayerState, TeamState } from '../types/gameState'
import type { LiveClientGameData, LiveClientItem, LiveClientPlayer } from './liveClient'

function toItemState(item: LiveClientItem): ItemState {
  return {
    id: item.itemID,
    name: item.displayName,
    count: item.count,
    slot: item.slot,
    details: null,
  }
}

function toPlayerState(player: LiveClientPlayer): PlayerState {
  return {
    name: player.riotId || player.summonerName || 'Unknown player',
    championName: player.championName,
    championKey: player.rawChampionName?.match(/^game_character_displayname_(.+)$/)?.[1] ?? null,
    champion: null,
    level: player.level,
    team: player.team,
    position: player.position || null,
    items: player.items.map(toItemState),
    kills: player.scores.kills,
    deaths: player.scores.deaths,
    assists: player.scores.assists,
    creepScore: player.scores.creepScore,
  }
}

export function toGameState(raw: LiveClientGameData): GameState {
  const { riotId, summonerName } = raw.activePlayer
  const activeIndex = raw.allPlayers.findIndex(
    (player) =>
      (riotId !== undefined && player.riotId === riotId) ||
      (summonerName !== undefined && player.summonerName === summonerName),
  )

  if (activeIndex < 0) {
    throw new Error('The active player was not found in the Live Client player list.')
  }

  const players = raw.allPlayers.map(toPlayerState)
  const player = players[activeIndex]
  player.level = raw.activePlayer.level

  const teamsById = new Map<string, TeamState>()
  for (const entry of players) {
    let team = teamsById.get(entry.team)
    if (!team) {
      team = { id: entry.team, players: [] }
      teamsById.set(entry.team, team)
    }
    team.players.push(entry)
  }

  return {
    gameTime: raw.gameData.gameTime,
    gameMode: raw.gameData.gameMode ?? null,
    mapName: raw.gameData.mapName ?? null,
    staticDataVersion: null,
    currentGold: raw.activePlayer.currentGold ?? null,
    player,
    allies: players.filter((entry) => entry.team === player.team),
    enemies: players.filter((entry) => entry.team !== player.team),
    teams: [...teamsById.values()],
  }
}
