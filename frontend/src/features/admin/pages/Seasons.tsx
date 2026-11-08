import { useState } from 'react';
import { api } from '../../../services/api';
import { AdminPage, FormError, InlineForm, Field, Panel, inputCls } from '../components';
import { useAdminList, useAdminWrite } from '../hooks';
import type { Season } from '../types';
import { usePageTitle } from '../../../lib/usePageTitle';

export function SeasonsPage() {
  usePageTitle('Temporadas — Admin');
  const list = useAdminList<Season[]>('admin-seasons', '/admin/seasons');
  const [label, setLabel] = useState('');
  const [pending, setPending] = useState(false);
  const w = useAdminWrite(() => setLabel(''));

  const create = () => {
    if (!label.trim()) return;
    setPending(true);
    w.run(() => api.post('/admin/seasons', { label: label.trim() }, { admin: true }), ['admin-seasons'])
      .finally(() => setPending(false));
  };

  return (
    <AdminPage title="Temporadas" desc="Una por año. Los torneos cuelgan de una temporada.">
      <Panel title="Nueva temporada">
        <InlineForm onSubmit={create} pending={pending} submitLabel="Crear">
          <Field label="Etiqueta (ej. 2026)">
            <input className={inputCls} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="2026" />
          </Field>
        </InlineForm>
        <FormError message={w.error} />
      </Panel>
      <div className="mt-4">
        <Panel title={`Registradas (${list.data?.length ?? 0})`}>
          {list.isPending ? <p className="text-sm text-ink-muted">Cargando…</p> : list.isError ? (
            <p className="text-sm text-ink-muted">No se pudo cargar. Verificá la sesión y el backend.</p>
          ) : (
            <ul className="divide-y divide-line">
              {list.data!.map((s) => (
                <li key={s.id} className="flex items-center justify-between py-2.5">
                  <span className="font-semibold">{s.label}</span>
                  <span className="text-sm text-ink-muted">{s.active ? 'Activa' : 'Inactiva'}</span>
                </li>
              ))}
              {list.data!.length === 0 && <li className="py-2 text-sm text-ink-muted">Sin temporadas.</li>}
            </ul>
          )}
        </Panel>
      </div>
</AdminPage>
  );
}
