import { useState } from 'react';
import { api } from '../../../services/api';
import { AdminPage, FormError, InlineForm, Field, Panel, inputCls } from '../components';
import { useAdminList, useAdminWrite } from '../hooks';
import type { AdminCategory, AdminTournament } from '../types';
import { usePageTitle } from '../../../lib/usePageTitle';

export function CategoriesPage() {
  usePageTitle('Categorías — Admin');
  const tournaments = useAdminList<AdminTournament[]>('admin-tournaments', '/tournaments');
  const [tournamentId, setTournamentId] = useState('');
  const list = useAdminList<AdminCategory[]>(
    'admin-categories',
    tournamentId ? `/categories?tournament=${tournamentId}` : null,
  );
  const [name, setName] = useState('');
  const [pending, setPending] = useState(false);
  const w = useAdminWrite(() => setName(''));

  const create = () => {
    if (!name.trim() || !tournamentId) return;
    setPending(true);
    w.run(
      () => api.post('/admin/categories', { tournamentId, name: name.trim() }, { admin: true }),
      ['admin-categories', 'admin-tournaments'],
    ).finally(() => setPending(false));
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
            </InlineForm>
            <FormError message={w.error} />
          </Panel>
          <div className="mt-4">
            <Panel title={`Registradas (${list.data?.length ?? 0})`}>
              {list.isPending ? <p className="text-sm text-ink-muted">Cargando…</p> : (
                <ul className="divide-y divide-line">
                  {(list.data ?? []).map((c) => (
                    <li key={c.id} className="flex items-center justify-between py-2">
                      <span className="font-medium">{c.name}</span>
                      <code className="rounded bg-black/5 px-1.5 py-0.5 text-xs">{c.slug}</code>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </div>
      )}
    </AdminPage>
  );
}
