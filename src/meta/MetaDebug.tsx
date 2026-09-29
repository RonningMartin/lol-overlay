import { roleFromPosition } from './role'
import type { MetaStatus } from './useChampionMeta'
import type { MetaItemGroup, MetaMatchup, MetaStats } from './types'
import type { GameState } from '../types/gameState'

function rate(value: number | null): string {
  return value === null ? '—' : `${(value * 100).toFixed(1)}%`
}

function gameCount(value: number): string {
  return `${value.toLocaleString()} ${value === 1 ? 'game' : 'games'}`
}

function Stats({ title, data }: { title: string; data: MetaStats | null }) {
  return (
    <div className="meta-stat-card">
      <h4>{title}</h4>
      {data ? (
        <p>Win {rate(data.winRate)} · Pick {rate(data.pickRate)} · Ban {rate(data.banRate)}
          {data.games !== null ? ` · ${gameCount(data.games)}` : ''}
          {data.roleRate !== null ? ` · ${rate(data.roleRate)} role share` : ''}
          {data.tier !== null ? ` · Tier ${data.tier}` : ''}
        </p>
      ) : <p className="muted">No role statistics reported.</p>}
    </div>
  )
}

function ItemGroups({ title, groups }: { title: string; groups: MetaItemGroup[] }) {
  return (
    <div className="meta-group">
      <h4>{title}</h4>
      {groups.length ? (
        <ul>
          {groups.map((group, index) => (
            <li key={`${title}-${group.ids.join('-')}-${index}`}>
              <strong>{group.names.length ? group.names.join(' → ') : group.ids.join(' → ')}</strong>
              <span>{group.pickRate !== null ? `Pick ${rate(group.pickRate)}` : 'Pick rate unavailable'}
                {group.games !== null ? ` · ${gameCount(group.games)}` : ''}
              </span>
            </li>
          ))}
        </ul>
      ) : <p className="muted">No data reported.</p>}
    </div>
  )
}

function Matchups({ title, matchups }: { title: string; matchups: MetaMatchup[] }) {
  return (
    <div className="meta-group">
      <h4>{title}</h4>
      {matchups.length ? (
        <ul>
          {matchups.map((matchup) => (
            <li key={matchup.champion}>
              <strong>{matchup.champion}</strong>
              <span>Player champion win rate {rate(matchup.winRate)}
                {matchup.games !== null ? ` · ${gameCount(matchup.games)}` : ''}</span>
            </li>
          ))}
        </ul>
      ) : <p className="muted">No matchup sample reported.</p>}
    </div>
  )
}

export function MetaDebug({ game, status, onRetry }: {
  game: GameState
  status: MetaStatus
  onRetry: () => void
}) {
  const champion = game.player.champion?.id || game.player.championName
  const role = roleFromPosition(game.player.position)

  return (
    <section className="meta-panel" aria-label="OP.GG meta data">
      <p className="section-label">Current meta · OP.GG MCP</p>
      <h2>{champion} {role ? role.toUpperCase() : 'role unknown'}</h2>
      {!role && <p className="muted">A recognized player role is needed to load role-specific meta data.</p>}
      {role && status.kind === 'loading' && <p className="muted" role="status">Loading current meta data...</p>}
      {role && status.kind === 'error' && (
        <div role="alert">
          <p>OP.GG data unavailable: {status.message}</p>
          <button className="meta-retry" type="button" onClick={onRetry}>Retry</button>
        </div>
      )}
      {role && status.kind === 'ready' && (
        <div className="meta-content">
          <p className="muted">Ranked · fetched {new Date(status.meta.fetchedAt).toLocaleString()} · cached by champion and role</p>
          <div className="meta-stats">
            <Stats title="All roles" data={status.meta.overallStats} />
            <Stats title={`${role.toUpperCase()} role`} data={status.meta.roleStats} />
          </div>
          <div className="meta-grid">
            <ItemGroups title="Common core build" groups={status.meta.coreBuilds} />
            <ItemGroups title="Boots" groups={status.meta.boots} />
            <ItemGroups title="Fourth item choices" groups={status.meta.fourthItems} />
            <ItemGroups title="Fifth item choices" groups={status.meta.fifthItems} />
            <ItemGroups title="Sixth item choices" groups={status.meta.sixthItems} />
            <Matchups title="Strong against" matchups={status.meta.strongAgainst} />
            <Matchups title="Weak against" matchups={status.meta.weakAgainst} />
          </div>
          <details className="meta-inspector">
            <summary>Inspect MetaProvider JSON</summary>
            <pre>{JSON.stringify(status.meta, null, 2)}</pre>
          </details>
        </div>
      )}
    </section>
  )
}
