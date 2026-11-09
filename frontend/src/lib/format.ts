export function formatKickoff(iso: string | null): string {
  if (!iso) return 'Horario a confirmar';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Horario a confirmar';
  return new Intl.DateTimeFormat('es-AR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(d);
}
