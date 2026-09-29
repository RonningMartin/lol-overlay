import { useEffect, useState } from 'react'
import { AiRecommendationDebug } from './dev/AiRecommendationDebug'
import { ContextDebug } from './dev/ContextDebug'
import { RecommendationContractDebug } from './dev/RecommendationContractDebug'
import { mockGameState } from './dev/mockGameState'
import { readGameState } from './league/readGameState'
import { MetaDebug } from './meta/MetaDebug'
import { useChampionMeta } from './meta/useChampionMeta'
import { buildRecommendationContext } from './recommendations/buildRecommendationContext'
import { dataDragon, type RiotDataCatalog } from './riot/dataDragon'
import { enrichGameState } from './riot/enrichGameState'
import type { GameState, ItemState, PlayerState } from './types/gameState'

type MatchStatus =
  | { kind: 'waiting' }
  | { kind: 'error' }
  | { kind: 'live'; game: GameState; updatedAt: number }

type DataSource = 'live' | 'sample'

type StaticStatus =
  | { kind: 'loading' }
  | { kind: 'ready'; catalog: RiotDataCatalog }
  | { kind: 'error'; message: string }

const statLabels: Record<string, { label: string; multiplier?: number; suffix?: string }> = {
  FlatHPPoolMod: { label: 'Health' },
  FlatMPPoolMod: { label: 'Mana' },
  FlatPhysicalDamageMod: { label: 'Attack Damage' },
  FlatMagicDamageMod: { label: 'Ability Power' },
  FlatArmorMod: { label: 'Armor' },
  FlatSpellBlockMod: { label: 'Magic Resist' },
  FlatMovementSpeedMod: { label: 'Movement Speed' },
  PercentAttackSpeedMod: { label: 'Attack Speed', multiplier: 100, suffix: '%' },
  FlatCritChanceMod: { label: 'Critical Strike Chance', multiplier: 100, suffix: '%' },
}

function formatStat(key: string, value: number): string {
  const spec = statLabels[key]
  if (!spec) return `${key}: ${value}`
  return `+${Number((value * (spec.multiplier ?? 1)).toFixed(2))}${spec.suffix ?? ''} ${spec.label}`
}

function formatGameTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`
}

function ItemList({ items, detailed = false }: { items: ItemState[]; detailed?: boolean }) {
  if (items.length === 0) {
    return <span className="muted">No items</span>
  }

  return (
    <ul className={detailed ? 'item-list item-list-detailed' : 'item-list'}>
      {items.map((item) => (
        <li key={`${item.slot}-${item.id}`}>
          <div className="item-summary">
            {item.details?.iconUrl && (
              <img className="item-icon" src={item.details.iconUrl} alt="" loading="lazy" />
            )}
            <span>
              {item.details?.name || item.name || `Item ${item.id}`}
              {item.count > 1 ? ` ×${item.count}` : ''}
              <span className="item-id">#{item.id}</span>
            </span>
          </div>
          {detailed && item.details && (
            <div className="item-details">
              <p>
                {item.details.price.total !== null
                  ? `${item.details.price.total} gold total`
                  : 'Price unavailable'}
                {item.details.price.base !== null
                  ? ` · ${item.details.price.base} gold combine cost`
                  : ''}
              </p>
              {item.details.description && <p className="item-description">{item.details.description}</p>}
              {Object.keys(item.details.stats).length > 0 && (
                <p>Stats: {Object.entries(item.details.stats).map(([key, value]) => formatStat(key, value)).join(' · ')}</p>
              )}
              {item.details.buildsFrom.length > 0 && (
                <p>Builds from: {item.details.buildsFrom.map((part) => part.name).join(' + ')}</p>
              )}
              {item.details.buildsInto.length > 0 && (
                <p>Builds into: {item.details.buildsInto.map((part) => part.name).join(', ')}</p>
              )}
            </div>
          )}
          {detailed && !item.details && <p className="item-details muted">No static details for this item.</p>}
        </li>
      ))}
    </ul>
  )
}

function PlayerList({ title, players }: { title: string; players: PlayerState[] }) {
  return (
    <section className="team-panel">
      <h3>{title} <span className="count">({players.length})</span></h3>
      {players.length === 0 ? (
        <p className="muted">No players reported.</p>
      ) : (
        <ul className="player-list">
          {players.map((player, index) => (
            <li className="player-card" key={`${player.team}-${player.name}-${index}`}>
              <div className="player-heading">
                <div className="champion-summary">
                  {player.champion?.iconUrl && (
                    <img className="champion-icon" src={player.champion.iconUrl} alt="" loading="lazy" />
                  )}
                  <div>
                    <strong>{player.champion?.name || player.championName || 'Unknown champion'}</strong>
                    <span className="player-name">{player.name}</span>
                  </div>
                </div>
                <span className="team-tag">{player.team || 'Unknown team'}</span>
              </div>
              <p className="player-stats">
                Level {player.level} · {player.kills}/
                {player.deaths}/{player.assists} K/D/A
                {player.position ? ` · ${player.position}` : ''}
              </p>
              <ItemList items={player.items} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function MatchDebug({ game, staticStatus }: { game: GameState; staticStatus: StaticStatus }) {
  const playerCount = game.allies.length + game.enemies.length
  return (
    <div className="match-debug">
      <section className="summary-panel">
        <div>
          <p className="section-label">Current match</p>
          <h2>{game.gameMode || 'League match'}</h2>
          <p className="muted">{game.mapName || 'Unknown map'} · {playerCount} players</p>
          <p className="muted">
            Riot static data: {game.staticDataVersion ||
              (staticStatus.kind === 'loading' ? 'loading...' : 'unavailable')}
            {staticStatus.kind === 'error' && ` (${staticStatus.message})`}
          </p>
        </div>
        <span className="game-clock">{formatGameTime(game.gameTime)}</span>
      </section>

      <section className="summary-panel current-player">
        <div>
          <p className="section-label">Current player</p>
          <div className="champion-summary">
            {game.player.champion?.iconUrl && (
              <img className="champion-icon champion-icon-large" src={game.player.champion.iconUrl} alt="" />
            )}
            <h2>{game.player.champion?.name || game.player.championName}</h2>
          </div>
          <p className="muted">{game.player.name}</p>
          {game.player.champion && (
            <p className="muted">Champion ID: {game.player.champion.numericId} · {game.player.champion.id}</p>
          )}
          <p className="player-stats">
            Level {game.player.level} · Team {game.player.team}
            {game.currentGold !== null
              ? ` · ${Math.floor(game.currentGold)} gold`
              : ''}
          </p>
          <h3>Current items</h3>
          <ItemList items={game.player.items} detailed />
        </div>
      </section>

      <h2 className="players-title">All players <span className="count">({playerCount})</span></h2>
      <div className="team-grid">
        <PlayerList title="Allies" players={game.allies} />
        <PlayerList title="Enemies" players={game.enemies} />
      </div>

      <details className="state-inspector">
        <summary>Inspect GameState JSON</summary>
        <p className="muted">The internal match model currently used by this dashboard.</p>
        <pre>{JSON.stringify(game, null, 2)}</pre>
      </details>
    </div>
  )
}

function App() {
  const [source, setSource] = useState<DataSource>(
    import.meta.env.DEV && new URLSearchParams(window.location.search).has('mock') ? 'sample' : 'live',
  )
  const [status, setStatus] = useState<MatchStatus>({ kind: 'waiting' })
  const [staticStatus, setStaticStatus] = useState<StaticStatus>({ kind: 'loading' })

  useEffect(() => {
    let active = true
    void dataDragon.loadCurrent()
      .then((catalog) => {
        if (active) setStaticStatus({ kind: 'ready', catalog })
      })
      .catch((error: unknown) => {
        if (active) {
          setStaticStatus({ kind: 'error', message: error instanceof Error ? error.message : 'Unknown error' })
        }
      })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (source === 'sample') return

    let stopped = false
    let timer: number | undefined
    let controller: AbortController | undefined

    async function poll() {
      controller = new AbortController()
      const timeout = window.setTimeout(() => controller?.abort(), 2500)

      try {
        const game = await readGameState(controller.signal)
        if (!stopped) {
          setStatus(game ? { kind: 'live', game, updatedAt: Date.now() } : { kind: 'waiting' })
        }
      } catch {
        if (!stopped) {
          setStatus({ kind: 'error' })
        }
      } finally {
        window.clearTimeout(timeout)
        if (!stopped) {
          timer = window.setTimeout(poll, 3000)
        }
      }
    }

    void poll()

    return () => {
      stopped = true
      controller?.abort()
      window.clearTimeout(timer)
    }
  }, [source])

  const game = source === 'sample' ? mockGameState : status.kind === 'live' ? status.game : null
  const displayGame = game && staticStatus.kind === 'ready'
    ? enrichGameState(game, staticStatus.catalog)
    : game
  const { status: metaStatus, retry: retryMeta } = useChampionMeta(displayGame)
  const context = game ? buildRecommendationContext(
    game,
    staticStatus.kind === 'ready' ? staticStatus.catalog : null,
    metaStatus.kind === 'ready' ? metaStatus.meta : null,
  ) : null

  return (
    <main className="app-shell">
      <div className="app-content">
        <p className="eyebrow">League of Legends</p>
        <h1>Game state dashboard</h1>
        <p className="intro">League Item Advisor · development view</p>

        <div className="source-panel">
          <div className="source-options" role="group" aria-label="Game data source">
            <button type="button" aria-pressed={source === 'live'} onClick={() => {
              setStatus({ kind: 'waiting' })
              setSource('live')
            }}>Live game</button>
            <button type="button" aria-pressed={source === 'sample'} onClick={() => setSource('sample')}>
              Sample game
            </button>
          </div>
          <p className="source-status" role="status">
            {source === 'sample'
              ? 'Showing sample GameState for development.'
              : status.kind === 'live'
                ? `Live GameState · updated ${new Date(status.updatedAt).toLocaleTimeString()}`
                : status.kind === 'waiting'
                  ? 'Looking for a running League match...'
                  : 'Live data unavailable · retrying automatically.'}
          </p>
        </div>

        {displayGame ? (
          <>
            <MatchDebug game={displayGame} staticStatus={staticStatus} />
            <MetaDebug game={displayGame} status={metaStatus} onRetry={retryMeta} />
            {context && <ContextDebug context={context} metaState={
              context.meta ? 'ready'
                : metaStatus.kind === 'loading' ? 'loading' : 'unavailable'
            } />}
            {context && <RecommendationContractDebug context={context} />}
            {context && <AiRecommendationDebug key={`${source}-${context.player.champion.name}`} context={context} />}
          </>
        ) : (
          <section className="placeholder" aria-live="polite">
            <span className="status-dot" aria-hidden="true" />
            <div>
              <h2>{status.kind === 'waiting' ? 'Waiting for League game...' : 'Could not read match data'}</h2>
              <p>
                {status.kind === 'waiting'
                  ? 'Open a League match or select Sample game to inspect the dashboard now.'
                  : 'The game data could not be read. This page will retry automatically; Sample game is also available.'}
              </p>
            </div>
          </section>
        )}
      </div>
    </main>
  )
}

export default App
