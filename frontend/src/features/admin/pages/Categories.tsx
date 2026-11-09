import { useState } from 'react';
import { api } from '../../../services/api';
import { AdminPage, FormError, InlineForm, Field, Panel, inputCls } from '../components';
import { useAdminList, useAdminWrite } from '../hooks';
import type { AdminCategory, AdminTournament } from '../types';
import { usePageTitle } from '../../../lib/usePageTitle';

function CategoryRow({ cat, onSave }: { cat: AdminCategory; onSave: (id: string, kickoffTime: string | null) => void }) {
  const [time, setTime] = useState(cat.kickoffTime ?? '');
  const valid = time === '' || /^\d{1,2}:\d{2}$/.test(time);
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 py-2">
      <span className="font-medium">{cat.name}</span>
      <span className="inline-flex items-center gap-2">
        <code className="rounded bg-black/5 px-1.5 py-0.5 text-xs">{cat.slug}</code>
        <input
          type="text"
          inputMode="numeric"
          placeholder="15:00"
          maxLength={5}
          aria-label={`Hora fija de ${cat.name} en formato 24 horas`}
          className={inputCls}
          value={time}
          onChange={(e) => setTime(e.target.value)}
        />
        <button
          onClick={() => valid && onSave(cat.id, time || null)}
          disabled={!valid}
          className="inline-flex h-11 items-center rounded-card border border-line px-4 text-sm font-semibold hover:border-primary disabled:opacity-50"
        >
          Guardar hora
        </button>
      </span>
    </li>
  );
}
export function CategoriesPage() {
  usePageTitle('Categorías — Admin');
  const tournaments = useAdminList<AdminTournament[]>('admin-tournaments', '/tournaments');
  const [tournamentId, setTournamentId] = useState('');
  const list = useAdminList<AdminCategory[]>(
    'admin-categories',
    tournamentId ? `/categories?tournament=${tournamentId}` : null,
  );
  const [name, setName] = useState('');
  const [time, setTime] = useState('');
  const [pending, setPending] = useState(false);
  const w = useAdminWrite(() => { setName(''); setTime(''); });

  const create = () => {
    if (!name.trim() || !tournamentId) return;
    setPending(true);
    w.run(
      () => api.post('/admin/categories', { tournamentId, name: name.trim(), kickoffTime: time || undefined }, { admin: true }),
      ['admin-categories', 'admin-tournaments'],
    ).finally(() => setPending(false));
  };

  const saveTime = (id: string, kickoffTime: string | null) => {
    w.run(() => api.patch(`/admin/categories/${id}`, { kickoffTime }, { admin: true }), ['admin-categories']);
  };

  return (
    <AdminPage title="Categorías" desc="Pertenecen a un torneo. El slug se genera solo.">
      <Panel title="Torneo de trabajo">
        <div className="flex flex-wrap gap-3">
          <Field label="Torneo">
            <select className={inputCls} value={tournamentId} onChange={(e) => setTournamentId(e.target.value)}>
              <option value="">Elegir torneo…</option>
              {(tournaments.data ?? []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </Field>
        </div>
      </Panel>
      {tournamentId && (
        <div className="mt-4">
          <Panel title="Nueva categoría">
            <InlineForm onSubmit={create} pending={pending} submitLabel="Crear">
              <Field label="Nombre (ej. 2011, Primera)">
                <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="2011" />
              </Field>
              <Field label="Hora fija 24h (opcional)">
                <input type="text" inputMode="numeric" placeholder="15:00" maxLength={5} className={inputCls} value={time} onChange={(e) => setTime(e.target.value)} />
              </Field>
            </InlineForm>
            <FormError message={w.error} />
          </Panel>
          <div className="mt-4">
            <Panel title={`Registradas (${list.data?.length ?? 0}) — hora fija por categoría`}>
              {list.isPending ? <p className="text-sm text-ink-muted">Cargando…</p> : (
                <ul className="divide-y divide-line">
                  {(list.data ?? []).map((c) => (
                    <CategoryRow key={c.id} cat={c} onSave={saveTime} />
                  ))}
                </ul>
              )}
              <FormError message={w.error} />
            </Panel>
          </div>
        </div>
      )}
    </AdminPage>
  );
}
