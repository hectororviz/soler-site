import { useState } from 'react';
import { api } from '../../../services/api';
import { AdminPage, FormError, InlineForm, Field, Panel, inputCls } from '../components';
import { useAdminList, useAdminWrite } from '../hooks';
import type { AdminBroadcast } from '../types';
import { usePageTitle } from '../../../lib/usePageTitle';

const STATUS = ['PROGRAMADA', 'EN_VIVO', 'FINALIZADA', 'INTERRUMPIDA'];

export function BroadcastsPage() {
  usePageTitle('Transmisiones — Admin');
  const list = useAdminList<AdminBroadcast[]>('admin-broadcasts', '/broadcasts?scope=all');
  const [matchId, setMatchId] = useState('');
  const [streamUrl, setStreamUrl] = useState('');
  const [pending, setPending] = useState(false);
  const w = useAdminWrite(() => { setMatchId(''); setStreamUrl(''); });

  const create = () => {
    if (!matchId.trim()) return;
    setPending(true);
    w.run(
      () => api.post('/admin/broadcasts', {
        categoryMatchId: matchId.trim(),
        streamUrl: streamUrl.trim() || undefined,
      }, { admin: true }),
      ['admin-broadcasts'],
    ).finally(() => setPending(false));
  };

  const setStatus = (id: string, status: string) => {
    w.run(() => api.patch(`/admin/broadcasts/${id}`, { status }, { admin: true }), ['admin-broadcasts']);
  };

  return (
    <AdminPage
      title="Transmisiones"
      desc="Vinculadas a un encuentro (ID de encuentro por categoría, visible en el fixture). El estado EN VIVO solo con señal verificada."
    >
      <Panel title="Nueva transmisión">
        <InlineForm onSubmit={create} pending={pending} submitLabel="Programar">
          <Field label="ID de encuentro (categoría)">
            <input className={inputCls} value={matchId} onChange={(e) => setMatchId(e.target.value)} placeholder="cuid del encuentro" />
          </Field>
          <Field label="URL de streaming">
            <input className={inputCls} value={streamUrl} onChange={(e) => setStreamUrl(e.target.value)} placeholder="https://…" />
          </Field>
        </InlineForm>
        <FormError message={w.error} />
      </Panel>
      <div className="mt-4">
        <Panel title={`Registradas (${list.data?.length ?? 0})`}>
          {list.isPending ? <p className="text-sm text-ink-muted">Cargando…</p> : list.isError ? (
            <p className="text-sm text-ink-muted">No se pudo cargar.</p>
          ) : (
            <ul className="divide-y divide-line">
              {(list.data ?? []).map((b) => (
                <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <span className="font-mono text-[13px]">{b.categoryMatchId.slice(0, 12)}…</span>
                  <span className="flex items-center gap-2">
                    <select
                      value={b.status}
                      onChange={(e) => setStatus(b.id, e.target.value)}
                      className="h-9 rounded-card border border-line px-2 text-sm font-semibold"
                      aria-label={`Estado de transmisión ${b.id}`}
                    >
                      {STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </span>
                </li>
              ))}
              {(list.data ?? []).length === 0 && <li className="py-2 text-sm text-ink-muted">Sin transmisiones.</li>}
            </ul>
          )}
        </Panel>
      </div>
    </AdminPage>
  );
}
