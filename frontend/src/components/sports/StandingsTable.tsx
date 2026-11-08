import type { StandingRow } from '../../types';
import { ClubBadge } from './badges';
import { cn } from '../../lib/utils';

export function StandingsTable({ rows }: { rows: StandingRow[] }) {
  return (
    <div className="table-scroll" role="region" aria-label="Tabla de posiciones" tabIndex={0}>
      <table className="w-full min-w-[640px] border-collapse bg-white text-sm">
        <thead>
          <tr className="border-b border-line text-left text-[13px] uppercase text-ink-muted">
            <th scope="col" className="px-3 py-3 font-semibold">#</th>
            <th scope="col" className="px-3 py-3 font-semibold">Club</th>
            <th scope="col" className="px-3 py-3 text-center font-semibold">PJ</th>
            <th scope="col" className="px-3 py-3 text-center font-semibold">G</th>
            <th scope="col" className="px-3 py-3 text-center font-semibold">E</th>
            <th scope="col" className="px-3 py-3 text-center font-semibold">P</th>
            <th scope="col" className="px-3 py-3 text-center font-semibold">DG</th>
            <th scope="col" className="px-3 py-3 text-center font-semibold">Pts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.club.id}
              className={cn('border-b border-line last:border-0', r.isSoler && 'bg-primary-soft')}
            >
              <td className="px-3 py-3 tabular-nums text-ink-muted">{r.position}</td>
              <td className={cn('px-3 py-3', r.isSoler && 'border-l-4 border-l-primary font-semibold')}>
                <ClubBadge club={r.club} size="sm" />
              </td>
              <td className="px-3 py-3 text-center tabular-nums">{r.played}</td>
              <td className="px-3 py-3 text-center tabular-nums">{r.won}</td>
              <td className="px-3 py-3 text-center tabular-nums">{r.drawn}</td>
              <td className="px-3 py-3 text-center tabular-nums">{r.lost}</td>
              <td className="px-3 py-3 text-center tabular-nums">{r.goalDiff ?? '—'}</td>
              <td className="px-3 py-3 text-center font-bold tabular-nums">{r.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
