import type { ChampionMeta, MetaItemGroup, MetaMatchup, MetaStats } from '../meta/types'
import { roleFromPosition } from '../meta/role'
import type { RiotDataCatalog } from '../riot/dataDragon'
import { enrichGameState } from '../riot/enrichGameState'
import type { GameState, ItemDetails, PlayerState } from '../types/gameState'
import type {
  ContextItem, ContextMeta, ContextMetaItemGroup, ContextMetaStats,
  ContextPlayer, RecommendationContext,
} from './contextTypes'

const statNames: Record<string, string> = {
  FlatHPPoolMod: 'health',
  FlatMPPoolMod: 'mana',
  FlatPhysicalDamageMod: 'attackDamage',
  FlatMagicDamageMod: 'abilityPower',
  FlatArmorMod: 'armor',
  FlatSpellBlockMod: 'magicResist',
  FlatMovementSpeedMod: 'movementSpeed',
  PercentAttackSpeedMod: 'attackSpeedFraction',
  FlatCritChanceMod: 'criticalStrikeFraction',
}

function contextPlayer(player: PlayerState): ContextPlayer {
  return {
    champion: {
      name: player.champion?.name || player.championName,
      id: player.champion?.id || player.championKey,
      numericId: player.champion?.numericId ?? null,
    },
    role: roleFromPosition(player.position),
    level: player.level,
    items: player.items.map(({ id, count }) => ({ id, count })),
    kills: player.kills,
    deaths: player.deaths,
    assists: player.assists,
    creepScore: player.creepScore,
  }
}

function metaGroups(groups: MetaItemGroup[]): ContextMetaItemGroup[] {
  return groups.map((group) => ({
    itemIds: [...group.ids], pickRate: group.pickRate, games: group.games,
  }))
}

function metaStats(stats: MetaStats): ContextMetaStats {
  return {
    winRate: stats.winRate, pickRate: stats.pickRate, banRate: stats.banRate,
    games: stats.games, roleRate: stats.roleRate, tier: stats.tier,
  }
}

function matchups(entries: MetaMatchup[]) {
  return entries.map((entry) => ({
    opponent: entry.champion, playerWinRate: entry.winRate, games: entry.games,
  }))
}

function contextMeta(meta: ChampionMeta): ContextMeta {
  return {
    source: meta.source,
    fetchedAt: meta.fetchedAt,
    role: meta.role,
    gameMode: meta.gameMode,
    overallStats: metaStats(meta.overallStats),
    roleStats: meta.roleStats ? metaStats(meta.roleStats) : null,
    coreBuilds: metaGroups(meta.coreBuilds),
    boots: metaGroups(meta.boots),
    laterItems: {
      fourth: metaGroups(meta.fourthItems),
      fifth: metaGroups(meta.fifthItems),
      sixth: metaGroups(meta.sixthItems),
    },
    matchups: {
      strongAgainst: matchups(meta.strongAgainst),
      weakAgainst: matchups(meta.weakAgainst),
    },
  }
}

function sameChampion(left: string, right: string): boolean {
  const normalize = (value: string) => value.replace(/[^a-z0-9]/gi, '').toLowerCase()
  return normalize(left) === normalize(right)
}

/** Build a compact, source-agnostic context. This function makes no network calls. */
export function buildRecommendationContext(
  game: GameState,
  catalog: RiotDataCatalog | null,
  meta: ChampionMeta | null,
): RecommendationContext {
  const resolved = catalog ? enrichGameState(game, catalog) : game
  const role = roleFromPosition(resolved.player.position)
  const relevantMeta = meta && role === meta.role &&
    sameChampion(meta.champion, resolved.player.champion?.id || resolved.player.championName)
    ? meta : null

  const participants = [resolved.player, ...resolved.allies, ...resolved.enemies]
  const names = new Map<number, string>()
  const details = new Map<number, ItemDetails>()
  for (const player of participants) {
    for (const item of player.items) {
      names.set(item.id, item.details?.name || item.name || `Item ${item.id}`)
      if (item.details) details.set(item.id, item.details)
    }
  }

  if (relevantMeta) {
    const groups = [
      ...relevantMeta.coreBuilds, ...relevantMeta.boots,
      ...relevantMeta.fourthItems, ...relevantMeta.fifthItems, ...relevantMeta.sixthItems,
    ]
    for (const group of groups) {
      group.ids.forEach((id, index) => {
        if (!names.has(id)) names.set(id, group.names[index] || `Item ${id}`)
      })
    }
  }

  const itemCatalog: ContextItem[] = [...names.keys()].sort((a, b) => a - b).map((id) => {
    const item = catalog?.items.get(id) || details.get(id)
    return {
      id,
      name: item?.name || names.get(id) || `Item ${id}`,
      totalCost: item?.price.total ?? null,
      description: item?.description ? item.description.replace(/\s+/g, ' ').trim() : null,
      stats: item ? Object.fromEntries(Object.entries(item.stats).map(([key, value]) => [statNames[key] || key, value])) : {},
      buildsFrom: item?.buildsFrom.map(({ id: componentId, name }) => ({ id: componentId, name })) ?? [],
    }
  })

  return {
    schemaVersion: 1,
    game: {
      timeSeconds: Math.floor(resolved.gameTime),
      mode: resolved.gameMode,
      map: resolved.mapName,
      riotDataVersion: resolved.staticDataVersion,
    },
    player: {
      ...contextPlayer(resolved.player),
      gold: resolved.currentGold === null ? null : Math.floor(resolved.currentGold),
    },
    allies: resolved.allies
      .filter((ally) => !(ally.name === resolved.player.name && ally.team === resolved.player.team))
      .map(contextPlayer),
    enemies: resolved.enemies.map(contextPlayer),
    itemCatalog,
    meta: relevantMeta ? contextMeta(relevantMeta) : null,
  }
}
