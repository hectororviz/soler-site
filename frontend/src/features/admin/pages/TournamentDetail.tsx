import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../../services/api';
import { AdminPage, ConfirmButton, FormError, InlineForm, Field, Panel, inputCls } from '../components';
import { useAdminList, useAdminWrite } from '../hooks';
import { resolveCrest } from '../../../services/api';
import type { AdminClub, AdminTournament, Participant } from '../types';
import { usePageTitle } from '../../../lib/usePageTitle';

export function TournamentDetailPage() {
  const { id } = useParams();
  usePageTitle('Torneo — Admin');
  const t = useAdminList<AdminTournament>('admin-tournament', id ? `/tournaments` : null);
  const tournament = (t.data as unknown as AdminTournament[] | undefined)?.find((x) => x.id === id);
  const parts = useAdminList<Participant[]>('admin-parts', id ? `/admin/tournaments/${id}/participants` : null);
  const clubs = useAdminList<AdminClub[]>('admin-clubs', '/clubs');
  const [clubId, setClubId] = useState('');
  const [cats, setCats] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const w = useAdminWrite(() => { setClubId(''); setCats([]); });

  const toggleCat = (cid: string) =>
    setCats((prev) => (prev.includes(cid) ? prev.filter((c) => c !== cid) : [...prev, cid]));

  const add = () => {
    if (!id || !clubId) return;
    setPending(true);
    w.run(
      () => api.post(`/admin/tournaments/${id}/participants`, { clubId, categoryIds: cats }, { admin: true }),
      ['admin-parts'],
    ).finally(() => setPending(false));
  };

  const remove = (clubIdToRemove: string) => {
    if (!id) return;
    w.run(() => api.del(`/admin/tournaments/${id}/participants/${clubIdToRemove}`, { admin: true }), ['admin-parts']);
  };

  if (!tournament && !t.isPending) {
    return <AdminPage title="Torneo no encontrado"><p className="text-sm text-ink-muted">ID inválido.</p></AdminPage>;
  }

  return (
    <AdminPage
      title={tournament?.name ?? 'Torneo'}
      desc={tournament ? `Slug /${tournament.slug} · categorías habilitadas por club (vacío = todas).` : undefined}
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title={`Categorías (${tournament?.categories.length ?? 0})`}>
          <ul className="divide-y divide-line">
            {(tournament?.categories ?? []).map((c) => (
              <li key={c.id} className="flex items-center justify-between py-2">
                <span className="font-medium">{c.name}</span>
                <code className="rounded bg-black/5 px-1.5 py-0.5 text-xs">{c.slug}</code>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[13px] text-ink-muted">
            Para crear categorías usá la sección Categorías con el ID de este torneo.
          </p>
        </Panel>
        <Panel title={`Clubes inscriptos (${parts.data?.length ?? 0})`}>
          <InlineForm onSubmit={add} pending={pending} submitLabel="Inscribir">
            <Field label="Club">
              <select className={inputCls} value={clubId} onChange={(e) => setClubId(e.target.value)}>
                <option value="">Elegir…</option>
                {(clubs.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
          </InlineForm>
          {(tournament?.categories.length ?? 0) > 0 && (
            <fieldset className="mt-3">
              <legend className="text-sm font-semibold">Categorías habilitadas (vacío = todas)</legend>
              <div className="mt-1 flex flex-wrap gap-2">
                {tournament!.categories.map((c) => (
                  <label key={c.id} className="inline-flex items-center gap-1.5 rounded-card border border-line px-2.5 py-1.5 text-sm">
                    <input type="checkbox" checked={cats.includes(c.id)} onChange={() => toggleCat(c.id)} />
                    {c.name}
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          <FormError message={w.error} />
          <ul className="mt-3 divide-y divide-line">
            {(parts.data ?? []).map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2 py-2">
                <span className="flex items-center gap-2">
                  {p.club.crestPath ? (
                    <img src={resolveCrest(p.club.crestPath) ?? ''} alt="" className="h-7 w-7 object-contain" loading="lazy" />
                  ) : null}
                  <span className="font-medium">{p.club.name}</span>
                  <span className="text-[13px] text-ink-muted">
                    {p.categoryIds.length === 0 ? 'todas' : `${p.categoryIds.length} cats.`}
                  </span>
                </span>
                <ConfirmButton onConfirm={() => remove(p.clubId)}>Quitar</ConfirmButton>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </AdminPage>
  );
}
