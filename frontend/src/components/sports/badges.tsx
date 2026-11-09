import { cn } from '../../lib/utils';
import { clubCrest } from '../../services/api';
import type { BroadcastStatus, Club, MatchStatus } from '../../types';

/* ---------- ClubBadge ---------- */
export function ClubBadge({
  club,
  size = 'md',
  showName = true,
  strong = false,
}: {
  club: Club;
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
  strong?: boolean;
}) {
  const box = size === 'lg' ? 'h-14 w-14 text-lg' : size === 'sm' ? 'h-9 w-9 text-xs' : 'h-11 w-11 text-sm';
  const src = clubCrest(club);
  return (
    <span className="inline-flex items-center gap-2">
      {src ? (
        <img src={src} alt={`Escudo de ${club.name}`} className={cn('object-contain', box)} loading="lazy" />
      ) : (
        <span
          aria-hidden
          className={cn('inline-flex items-center justify-center rounded-full bg-pitch font-display font-bold text-gold', box)}
        >
          {club.shortName.slice(0, 2).toUpperCase()}
        </span>
      )}
      {showName && <span className={strong ? 'font-extrabold' : 'font-semibold'}>{club.shortName}</span>}
    </span>
  );
}

/* ---------- MatchStatusBadge ---------- */
const statusStyle: Record<MatchStatus, string> = {
  EN_VIVO: 'bg-primary text-white',
  PROXIMO: 'bg-black/5 text-ink',
  FINALIZADO: 'bg-pitch text-white',
  SUSPENDIDO: 'bg-gold/20 text-ink border border-gold',
  PROGRAMADO: 'bg-white text-ink-muted border border-line',
};

const statusLabel: Record<MatchStatus, string> = {
  EN_VIVO: 'En vivo',
  PROXIMO: 'Próximo',
  FINALIZADO: 'Finalizado',
  SUSPENDIDO: 'Suspendido',
  PROGRAMADO: 'Programado',
};

export function MatchStatusBadge({ status }: { status: MatchStatus }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold', statusStyle[status])}>
      {status === 'EN_VIVO' && <span aria-hidden className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-white" />}
      {statusLabel[status]}
    </span>
  );
}

/* ---------- LiveIndicator ---------- */
export function LiveIndicator({ label = 'EN VIVO' }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-primary px-3 py-1 text-xs font-bold tracking-wide text-white">
      <span className="live-dot relative inline-block h-2 w-2 rounded-full bg-white" aria-hidden />
      {label}
    </span>
  );
}

/* ---------- ScoreDisplay ---------- */
export function ScoreDisplay({
  home,
  away,
  status,
}: {
  home: number | null;
  away: number | null;
  status: MatchStatus;
}) {
  if (status !== 'FINALIZADO' || home === null || away === null) {
    return <span className="text-sm text-ink-muted">Resultado a confirmar</span>;
  }
  return (
    <span className="font-display text-3xl font-extrabold tabular-nums" aria-label={`Resultado ${home} a ${away}`}>
      {home} <span className="text-ink-muted">–</span> {away}
    </span>
  );
}

/* ---------- BroadcastBadge ---------- */
const bStyle: Record<BroadcastStatus, string> = {
  EN_VIVO: 'bg-primary text-white',
  PROGRAMADA: 'bg-white text-ink border border-line',
  FINALIZADA: 'bg-black/5 text-ink-muted',
  INTERRUMPIDA: 'bg-gold/20 text-ink border border-gold',
};

const bLabel: Record<BroadcastStatus, string> = {
  EN_VIVO: 'En vivo',
  PROGRAMADA: 'Programada',
  FINALIZADA: 'Finalizada',
  INTERRUMPIDA: 'Interrumpida',
};

export function BroadcastBadge({ status }: { status: BroadcastStatus }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold', bStyle[status])}>
      {bLabel[status]}
    </span>
  );
}
