import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../../services/api';
import { AdminPage, FormError, InlineForm, Field, Panel, inputCls } from '../components';
import { useAdminList, useAdminWrite } from '../hooks';
import type { AdminTournament, Season } from '../types';
import { usePageTitle } from '../../../lib/usePageTitle';

export function TournamentsPage() {
  usePageTitle('Torneos — Admin');
  const seasons = useAdminList<Season[]>('admin-seasons', '/admin/seasons');
  const list = useAdminList<AdminTournament[]>('admin-tournaments', '/tournaments');
  const [name, setName] = useState('');
  const [seasonId, setSeasonId] = useState('');
  const [pending, setPending] = useState(false);
  const w = useAdminWrite(() => { setName(''); });

  const create = () => {
    if (!name.trim() || !seasonId) return;
    setPending(true);
    w.run(() => api.post('/admin/tournaments', { name: name.trim(), seasonId }, { admin: true }), ['admin-tournaments'])
      .finally(() => setPending(false));
  };

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const saveName = (id: string) => {
    if (!editingName.trim()) return;
    w.run(() => api.patch(`/admin/tournaments/${id}`, { name: editingName.trim() }, { admin: true }), ['admin-tournaments'])
      .then(() => setEditingId(null));
  };

  return (
    <AdminPage title="Torneos" desc="Competiciones por temporada. El slug se genera solo.">
      <Panel title="Nuevo torneo">
        <InlineForm onSubmit={create} pending={pending} submitLabel="Crear">
          <Field label="Nombre">
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Juveniles Domingos" />
          </Field>
          <Field label="Temporada">
            <select className={inputCls} value={seasonId} onChange={(e) => setSeasonId(e.target.value)}>
              <option value="">Elegir…</option>
              {(seasons.data ?? []).map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </Field>
        </InlineForm>
        <FormError message={w.error} />
      </Panel>
      <div className="mt-4">
        <Panel title={`Configurados (${list.data?.length ?? 0})`}>
          {list.isPending ? <p className="text-sm text-ink-muted">Cargando…</p> : list.isError ? (
            <p className="text-sm text-ink-muted">No se pudo cargar.</p>
          ) : (
            <ul className="divide-y divide-line">
              {list.data!.map((t) => (
                <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  {editingId === t.id ? (
                    <span className="flex flex-1 flex-wrap items-center gap-2">
                      <input
                        className={inputCls}
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        aria-label="Nombre del torneo"
                        autoFocus
                      />
                      <button onClick={() => saveName(t.id)} className="inline-flex h-11 items-center rounded-card bg-pitch px-4 font-bold text-white">
                        Guardar
                      </button>
                      <button onClick={() => setEditingId(null)} className="inline-flex h-11 items-center rounded-card border border-line px-4">
                        Cancelar
                      </button>
                    </span>
                  ) : (
                    <span>
                      <Link to={`/admin/torneos/${t.id}`} className="font-semibold text-primary hover:underline">{t.name}</Link>
                      <span className="ml-2 text-sm text-ink-muted">{t.season?.label} · {t.categories.length} categorías · /{t.slug}</span>
                      <button onClick={() => { setEditingId(t.id); setEditingName(t.name); }} className="ml-3 text-sm font-semibold text-ink-muted hover:text-primary">
                        Renombrar
                      </button>
                    </span>
                  )}
                  <Link to={`/admin/fixture?torneo=${t.slug}`} className="text-sm font-semibold text-ink-muted hover:text-primary">
                    Ir al fixture →
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </AdminPage>
  );
}
