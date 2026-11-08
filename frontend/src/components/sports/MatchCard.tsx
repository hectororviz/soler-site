import { Link } from 'react-router-dom';
import { Radio } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { MatchSummary } from '../../types';
import { formatKickoff } from '../../lib/format';
import { ClubBadge, MatchStatusBadge, ScoreDisplay } from './badges';

export function MatchCard({ match, highlightSoler = true }: { match: MatchSummary; highlightSoler?: boolean }) {
  const isSoler = [match.home.shortName, match.home.name, match.away.shortName, match.away.name].some((s) =>
    s?.toLowerCase().includes('soler'),
  );
  return (
    <article
      className={cn(
        'rounded-card border bg-white p-4 shadow-soft transition-shadow hover:shadow-lift',
        isSoler && highlightSoler ? 'border-l-4 border-l-primary border border-line' : 'border-line',
      )}
    >
      <div className="flex items-center justify-between gap-2 text-[13px] text-ink-muted">
        <span>
          <span className="mr-1 inline-flex items-center rounded-full bg-pitch px-2 py-0.5 font-bold text-white">{match.tournamentName}</span>
          {match.categoryName} · {match.roundLabel}
        </span>
        <MatchStatusBadge status={match.status} />
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex flex-1 flex-col gap-2">
          <ClubBadge club={match.home} />
          <ClubBadge club={match.away} />
        </div>
        <div className="text-right">
          <ScoreDisplay home={match.homeScore} away={match.awayScore} status={match.status} />
          {match.status !== 'FINALIZADO' && (
            <p className="mt-1 text-[13px] text-ink-muted">
              {formatKickoff(match.kickoff)}
              {match.venue ? ` · ${match.venue}` : ''}
            </p>
          )}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
        {match.hasBroadcast ? (
          <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary">
            <Radio size={15} aria-hidden /> Con transmisión
          </span>
        ) : (
          <span className="text-[13px] text-ink-muted">Sin transmisión asignada</span>
        )}
        <Link to={`/fixture?partido=${match.id}`} className="text-sm font-semibold text-primary hover:underline">
          Ver detalle
        </Link>
      </div>
    </article>
  );
}
