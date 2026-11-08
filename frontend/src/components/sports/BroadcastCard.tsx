import { Link } from 'react-router-dom';
import type { Broadcast } from '../../types';
import { formatKickoff } from '../../lib/format';
import { BroadcastBadge, ClubBadge, LiveIndicator } from './badges';

export function BroadcastCard({ broadcast }: { broadcast: Broadcast }) {
  const target = broadcast.embedUrl ?? broadcast.streamUrl ?? '/soler-tv';
  const external = target.startsWith('http');
  return (
    <article className="rounded-card overflow-hidden bg-pitch text-white shadow-soft">
      <div className="flex items-center justify-between px-4 pt-4">
        {broadcast.status === 'EN_VIVO' ? <LiveIndicator /> : <BroadcastBadge status={broadcast.status} />}
        <span className="text-[13px] text-white/70">
          {broadcast.tournamentName} · {broadcast.categoryName}
        </span>
      </div>
      <div className="flex items-center justify-between gap-4 px-4 py-5">
        <div className="flex flex-1 flex-col items-center gap-2 text-center">
          <ClubBadge club={broadcast.home} size="lg" />
        </div>
        <div className="text-center">
          <p className="font-display text-2xl font-bold">VS</p>
          <p className="mt-1 text-[13px] text-white/70">{formatKickoff(broadcast.kickoff)}</p>
        </div>
        <div className="flex flex-1 flex-col items-center gap-2 text-center">
          <ClubBadge club={broadcast.away} size="lg" />
        </div>
      </div>
      <div className="px-4 pb-4">
        {broadcast.status === 'EN_VIVO' && target ? (
          external ? (
            <a
              href={target}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-11 items-center justify-center rounded-card bg-primary font-semibold text-white hover:bg-primary-hover"
            >
              Ver transmisión
            </a>
          ) : (
            <Link to={target} className="flex h-11 items-center justify-center rounded-card bg-primary font-semibold text-white">
              Ver transmisión
            </Link>
          )
        ) : broadcast.status === 'INTERRUMPIDA' ? (
          <p className="rounded-card border border-gold/50 px-4 py-3 text-center text-sm text-white/80">
            Señal interrumpida. No declaramos EN VIVO sin confirmación del streaming.
          </p>
        ) : (
          <p className="rounded-card bg-white/10 px-4 py-3 text-center text-sm text-white/80">
            Programada · {formatKickoff(broadcast.kickoff)}
          </p>
        )}
      </div>
    </article>
  );
}
