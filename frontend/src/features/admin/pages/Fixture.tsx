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
  const [homeId, setHomeId] = useState('');
  const [awayId, setAwayId] = useState('');
  const [pending, setPending] = useState(false);
  const w = useAdminWrite(() => { setNewLabel(''); setHomeId(''); setAwayId(''); });

  const refresh = ['admin-matchdays'];

  const createDay = () => {
    if (!active || !newLabel.trim()) return;
    setPending(true);
    w.run(
      () => api.post('/admin/matchdays', { tournamentId: active.id, label: newLabel.trim() }, { admin: true }),
      refresh,
    ).finally(() => setPending(false));
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

  const saveCategory = (catId: string, data: { kickoff?: string; venue?: string; status?: string }) => {
    w.run(() => api.patch(`/admin/category-matches/${catId}`, data, { admin: true }), refresh);
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
            </InlineForm>
            <ul className="mt-3 space-y-1">
              {(days.data ?? []).map((d) => (
                <li key={d.id}>
                  <button
                    onClick={() => setDayId(d.id)}
                    className={`flex w-full items-center justify-between rounded-card border px-3 py-2 text-left text-sm ${d.id === selected?.id ? 'border-primary bg-primary-soft font-bold' : 'border-line'}`}
                  >
                    <span>{d.label} <span className="text-ink-muted">({d.matches.length})</span></span>
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
                <div className="mt-4 space-y-3">
                  {selected.matches.map((m) => (
                    <ClashEditor
                      key={m.id}
                      clash={m}
                      onSave={saveCategory}
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

function ClashEditor({ clash, onSave, onRemove }: {
  clash: DetailClash;
  onSave: (catId: string, data: { kickoff?: string; venue?: string; status?: string }) => void;
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

  return (
    <article className="rounded-card border border-line p-3">
      <div className="flex flex-wrap items-center gap-2 font-semibold">
        {clash.homeClub.crestPath && <img src={resolveCrest(clash.homeClub.crestPath) ?? ''} alt="" className="h-7 w-7 object-contain" />}
        {clash.homeClub.shortName}
        <span className="text-ink-muted">vs</span>
        {clash.awayClub.shortName}
        {clash.awayClub.crestPath && <img src={resolveCrest(clash.awayClub.crestPath) ?? ''} alt="" className="h-7 w-7 object-contain" />}
        <span className="ml-auto inline-flex items-center gap-2">
          <button onClick={() => setOpen((v) => !v)} className="text-sm font-semibold text-primary hover:underline">
            {open ? 'Ocultar categorías' : `Ver categorías (${clash.categories.length})`}
          </button>
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
