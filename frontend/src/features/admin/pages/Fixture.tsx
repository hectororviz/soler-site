import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, resolveCrest } from '../../../services/api';
import { AdminPage, ConfirmButton, FormError, InlineForm, Field, Panel, inputCls } from '../components';
import { useAdminList, useAdminWrite } from '../hooks';
import { formatKickoff } from '../../../lib/format';
import type { AdminClub, AdminMatchday, AdminTournament, Participant } from '../types';
import { usePageTitle } from '../../../lib/usePageTitle';

interface DetailCategory {
  id: string;
  categoryId: string;
  category?: { id: string; name: string };
  kickoff: string | null;
  venue: string | null;
  status: string;
}
interface DetailClash {
  id: string;
  homeClub: AdminClub;
  awayClub: AdminClub;
  categories: DetailCategory[];
}
interface DetailDay extends AdminMatchday {
  matches: DetailClash[];
}

const STATUS = ['PROGRAMADO', 'PROXIMO', 'EN_VIVO', 'FINALIZADO', 'SUSPENDIDO'];

function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function FixtureAdminPage() {
  usePageTitle('Fixture — Admin');
  const [params, setParams] = useSearchParams();
  const tournaments = useAdminList<AdminTournament[]>('admin-tournaments', '/tournaments');
  const torneoSlug = params.get('torneo') ?? '';
  const active = (tournaments.data ?? []).find((t) => t.slug === torneoSlug) ?? (tournaments.data ?? [])[0];

  const days = useAdminList<DetailDay[]>(
    'admin-matchdays',
    active ? `/admin/matchdays?tournament=${active.id}` : null,
  );
  const parts = useAdminList<Participant[]>(
    'admin-parts',
    active ? `/admin/tournaments/${active.id}/participants` : null,
  );

  const [dayId, setDayId] = useState<string>('');
  const selected = (days.data ?? []).find((d) => d.id === dayId) ?? (days.data ?? [])[0];

  const [newLabel, setNewLabel] = useState('');
  const [newDate, setNewDate] = useState('');
  const [homeId, setHomeId] = useState('');
  const [awayId, setAwayId] = useState('');
  const [pending, setPending] = useState(false);
  const w = useAdminWrite(() => { setNewLabel(''); setNewDate(''); setHomeId(''); setAwayId(''); });

  const refresh = ['admin-matchdays'];

  const playing = new Set((selected?.matches ?? []).flatMap((m) => [m.homeClub.id, m.awayClub.id]));
  const libres = (parts.data ?? []).map((p) => p.club).filter((c) => !playing.has(c.id));

  const createDay = () => {
    if (!active || !newLabel.trim()) return;
    setPending(true);
    w.run(
      () => api.post('/admin/matchdays', { tournamentId: active.id, label: newLabel.trim(), date: newDate || undefined }, { admin: true }),
      refresh,
    ).finally(() => setPending(false));
  };

  const saveDay = (label: string, date: string | null) => {
    if (!selected) return;
    w.run(
      () => api.patch(`/admin/matchdays/${selected.id}`, { label, date }, { admin: true }),
      refresh,
    );
  };

  const addMatch = () => {
    if (!selected || !homeId || !awayId) return;
    setPending(true);
    w.run(
      () => api.post(`/admin/matchdays/${selected.id}/matches`, { homeClubId: homeId, awayClubId: awayId }, { admin: true }),
      refresh,
    ).finally(() => setPending(false));
  };

  const publish = (published: boolean) => {
    if (!selected) return;
    w.run(
      () => api.patch(`/admin/matchdays/${selected.id}/publish`, { published }, { admin: true }),
      refresh,
    );
  };

  const secondLeg = () => {
    if (!active) return;
    setPending(true);
    w.run(
      () => api.post(`/admin/tournaments/${active.id}/fixture/second-leg`, {}, { admin: true }),
      refresh,
    ).finally(() => setPending(false));
  };

  const saveCategory = (catId: string, data: { kickoff?: string; venue?: string; status?: string }) => {
    w.run(() => api.patch(`/admin/category-matches/${catId}`, data, { admin: true }), refresh);
  };

  const setMatchStatus = (matchId: string, status: string) => {
    w.run(() => api.patch(`/admin/matches/${matchId}/status`, { status }, { admin: true }), refresh);
  };

  const removeMatch = (matchId: string) => {
    w.run(() => api.del(`/admin/matches/${matchId}`, { admin: true }), refresh);
  };

  return (
    <AdminPage
      title="Fixture"
      desc="Flujo: torneo → fecha → enfrentamientos local/visitante (se generan los encuentros por categoría) → horario/sede → publicar."
    >
      <Panel title="Torneo">
        <div className="flex flex-wrap gap-2">
          {(tournaments.data ?? []).map((t) => (
            <button
              key={t.id}
              onClick={() => { setParams({ torneo: t.slug }); setDayId(''); }}
              className={`rounded-card border px-4 py-2.5 text-sm font-bold ${t.slug === active?.slug ? 'border-primary bg-primary-soft text-primary' : 'border-line bg-white'}`}
            >
              {t.name}
            </button>
          ))}
        </div>
      </Panel>

      {active && (
        <div className="mt-4 grid gap-4 lg:grid-cols-[280px_1fr]">
          <Panel title="Fechas">
            <InlineForm onSubmit={createDay} pending={pending} submitLabel="Crear">
              <Field label="Etiqueta (ej. Fecha 9)">
                <input className={inputCls} value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="Fecha 9" />
              </Field>
              <Field label="Día (opcional)">
                <input type="date" className={inputCls} value={newDate} onChange={(e) => setNewDate(e.target.value)} />
              </Field>
            </InlineForm>
            <ul className="mt-3 space-y-1">
              {(days.data ?? []).map((d) => (
                <li key={d.id}>
                  <button
                    onClick={() => setDayId(d.id)}
                    className={`flex w-full items-center justify-between rounded-card border px-3 py-2 text-left text-sm ${d.id === selected?.id ? 'border-primary bg-primary-soft font-bold' : 'border-line'}`}
                  >
                    <span>{d.label} <span className="text-ink-muted">({d.matches.length})</span>
                      {d.date ? <span className="text-ink-muted"> · {new Date(d.date).toLocaleDateString()}</span> : null}
                    </span>
                    <span className={d.published ? 'font-bold text-field' : 'text-ink-muted'}>
                      {d.published ? 'Publicada' : 'Borrador'}
                    </span>
                  </button>
                </li>
              ))}
              {(days.data ?? []).length === 0 && !days.isPending && (
                <li className="text-sm text-ink-muted">Sin fechas. Creá la primera arriba.</li>
              )}
            </ul>
            <div className="mt-3">
              <ConfirmButton onConfirm={secondLeg} confirmLabel="¿Generar la segunda rueda espejada?">
                Generar segunda rueda
              </ConfirmButton>
              <FormError message={w.error} />
            </div>
          </Panel>

          <Panel
            title={selected ? `${selected.label} — ${selected.published ? 'Publicada' : 'Borrador'}` : 'Fecha'}
            action={selected ? (
              selected.published ? (
                <ConfirmButton onConfirm={() => publish(false)}>Despublicar</ConfirmButton>
              ) : (
                <button
                  onClick={() => publish(true)}
                  className="inline-flex h-9 items-center rounded-card bg-field px-4 text-sm font-bold text-white"
                >
                  Publicar fecha
                </button>
              )
            ) : undefined}
          >
            {selected ? (
              <>
                <DayEditor key={selected.id} day={selected} onSave={saveDay} />
                <InlineForm onSubmit={addMatch} pending={pending} submitLabel="Agregar cruce">
                  <Field label="Local">
                    <select className={inputCls} value={homeId} onChange={(e) => setHomeId(e.target.value)}>
                      <option value="">Elegir…</option>
                      {(parts.data ?? []).map((p) => <option key={p.clubId} value={p.clubId}>{p.club.name}</option>)}
                    </select>
                  </Field>
                  <Field label="Visitante">
                    <select className={inputCls} value={awayId} onChange={(e) => setAwayId(e.target.value)}>
                      <option value="">Elegir…</option>
                      {(parts.data ?? []).map((p) => <option key={p.clubId} value={p.clubId}>{p.club.name}</option>)}
                    </select>
                  </Field>
                </InlineForm>
                <FormError message={w.error} />
                {libres.length > 0 && selected && selected.matches.length > 0 && (
                  <p className="mt-3 text-sm text-ink-muted">
                    Libre: <span className="font-semibold text-ink">{libres.map((c) => c.shortName).join(', ')}</span>
                  </p>
                )}
                <div className="mt-4 space-y-3">
                  {selected.matches.map((m) => (
                    <ClashEditor
                      key={m.id}
                      clash={m}
                      onSave={saveCategory}
                      onWhole={(status) => setMatchStatus(m.id, status)}
                      onRemove={() => removeMatch(m.id)}
                    />
                  ))}
                  {selected.matches.length === 0 && (
                    <p className="text-sm text-ink-muted">Sin cruces. Agregá el primero arriba: los encuentros por categoría se generan solos.</p>
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-ink-muted">Seleccioná o creá una fecha.</p>
            )}
          </Panel>
        </div>
      )}
    </AdminPage>
  );
}

function DayEditor({ day, onSave }: {
  day: { label: string; date: string | null };
  onSave: (label: string, date: string | null) => void;
}) {
  const toInput = (iso: string | null) => (iso ? iso.slice(0, 10) : '');
  const [label, setLabel] = useState(day.label);
  const [date, setDate] = useState(toInput(day.date));
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSave(label.trim() || day.label, date || null); }}
      className="mb-3 flex flex-wrap items-end gap-3 rounded-card bg-black/[0.03] p-3"
    >
      <Field label="Etiqueta">
        <input className={inputCls} value={label} onChange={(e) => setLabel(e.target.value)} />
      </Field>
      <Field label="Día">
        <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>
      <button type="submit" className="inline-flex h-11 items-center rounded-card bg-pitch px-5 font-bold text-white hover:bg-black">
        Guardar fecha
      </button>
    </form>
  );
}

function ClashEditor({ clash, onSave, onWhole, onRemove }: {
  clash: DetailClash;
  onSave: (catId: string, data: { kickoff?: string; venue?: string; status?: string }) => void;
  onWhole: (status: string) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [kickoff, setKickoff] = useState('');
  const [venue, setVenue] = useState('');
  const [status, setStatus] = useState('PROGRAMADO');

  const start = (c: DetailCategory) => {
    setEditing(c.id);
    setKickoff(toLocalInput(c.kickoff));
    setVenue(c.venue ?? '');
    setStatus(c.status);
  };

  const save = () => {
    if (!editing) return;
    onSave(editing, {
      kickoff: kickoff ? new Date(kickoff).toISOString() : undefined,
      venue: venue || undefined,
      status,
    });
    setEditing(null);
  };

  const allPlayed = clash.categories.length > 0 && clash.categories.every((c) => c.status === 'FINALIZADO');

  return (
    <article className="rounded-card border border-line p-3">
      <div className="flex flex-wrap items-center gap-2 font-semibold">
        {clash.homeClub.crestPath && <img src={resolveCrest(clash.homeClub.crestPath) ?? ''} alt="" className="h-7 w-7 object-contain" width={28} height={28} />}
        {clash.homeClub.shortName}
        <span className="text-ink-muted">vs</span>
        {clash.awayClub.shortName}
        {clash.awayClub.crestPath && <img src={resolveCrest(clash.awayClub.crestPath) ?? ''} alt="" className="h-7 w-7 object-contain" width={28} height={28} />}
        <span className="ml-auto inline-flex items-center gap-2">
          <button onClick={() => setOpen((v) => !v)} className="text-sm font-semibold text-primary hover:underline">
            {open ? 'Ocultar categorías' : `Ver categorías (${clash.categories.length})`}
          </button>
          {allPlayed ? (
            <button onClick={() => onWhole('PROGRAMADO')} className="text-sm font-semibold text-primary hover:underline">Reabrir cruce</button>
          ) : (
            <button onClick={() => onWhole('FINALIZADO')} className="text-sm font-semibold text-primary hover:underline">Marcar jugado</button>
          )}
          <ConfirmButton onConfirm={onRemove}>Eliminar cruce</ConfirmButton>
        </span>
      </div>
      {open && (
      <ul className="mt-2 divide-y divide-line">
        {clash.categories.map((c) => (
          <li key={c.id} className="py-2">
            {editing === c.id ? (
              <div className="flex flex-wrap items-end gap-2">
                <Field label={c.category?.name ?? 'Categoría'}>
                  <span className="py-2 text-sm font-normal text-ink-muted">{c.category?.name}</span>
                </Field>
                <Field label="Horario">
                  <input type="datetime-local" className={inputCls} value={kickoff} onChange={(e) => setKickoff(e.target.value)} />
                </Field>
                <Field label="Sede">
                  <input className={inputCls} value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="Cancha Soler" />
                </Field>
                <Field label="Estado">
                  <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value)}>
                    {STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
                <button onClick={save} className="inline-flex h-11 items-center rounded-card bg-pitch px-4 font-bold text-white">Guardar</button>
                <button onClick={() => setEditing(null)} className="inline-flex h-11 items-center rounded-card border border-line px-4">Cancelar</button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="font-semibold">{c.category?.name}</span>
                <span className="text-ink-muted">{formatKickoff(c.kickoff)}{c.venue ? ` · ${c.venue}` : ''} · {c.status}</span>
                <button onClick={() => start(c)} className="font-semibold text-primary hover:underline">Editar</button>
              </div>
            )}
          </li>
        ))}
      </ul>
      )}
    </article>
  );
}
