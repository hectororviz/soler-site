/**
 * Estudio de flyers (admin): elige partido real del fixture, plantilla,
 * formato, colores y fondo; vista previa en vivo e idéntica a la exportación.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Download, ImagePlus, RotateCcw, TriangleAlert } from 'lucide-react';
import { AdminPage, Field, Panel, inputCls } from '../../admin/components';
import { usePageTitle } from '../../../lib/usePageTitle';
import { useFixtureRounds, useTournaments } from '../../fixtures/useFixture';
import { contentFromPublicRound } from '../content';
import { downloadBlob, exportFlyerPng, renderFlyerCanvas } from '../engine';
import {
  FORMATS,
  TEMPLATES,
  defaultOptions,
  flyerFileName,
  type FlyerContent,
  type FlyerOptions,
  type FormatId,
  type TemplateId,
} from '../types';
import type { FixtureClash, FixtureRound } from '../../../types';

const STORAGE_KEY = 'csd-flyer-studio-v1';

/** Contenido de prueba (solo ?demo=1 en dev): no sale del navegador. */
function demoData(): { tournaments: { id: string; slug: string; name: string }[]; rounds: FixtureRound[] } {
  const soler = { id: 'soler', name: 'Club Social y Deportivo Soler', shortName: 'Soler', crestUrl: '/escudo.svg' as string | null, crestPath: null, mapsUrl: null };
  const rival = { id: 'torino', name: 'Club Torino', shortName: 'Torino', crestUrl: null, crestPath: null, mapsUrl: null };
  const cats = ['2011', '2012', '2013', '2014', '2015', '2016', '2017'];
  const clash: FixtureClash = {
    id: 'demo-clash',
    roundId: 'demo-fecha',
    roundLabel: 'Fecha 8',
    tournamentId: 'demo-t',
    home: soler,
    away: rival,
    isSoler: true,
    categories: cats.map((c, i) => ({
      id: `demo-${c}`,
      categoryId: c,
      categoryName: c,
      kickoff: new Date(2026, 10, 23, 9 + Math.floor(i / 2), i % 2 === 0 ? 0 : 30).toISOString(),
      venue: 'Cancha Soler',
      status: 'PROGRAMADO' as const,
      homeScore: null,
      awayScore: null,
      broadcastId: null,
    })),
  };
  return {
    tournaments: [{ id: 'demo-t', slug: 'demo', name: 'Juveniles Domingos (demo)' }],
    rounds: [{ id: 'demo-fecha', label: 'Fecha 8', order: 8, published: true, date: new Date(2026, 10, 23).toISOString(), matches: [clash] }],
  };
}

function loadPrefs(): Partial<FlyerOptions> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const p = JSON.parse(raw) as Partial<FlyerOptions>;
    if (p.template && !TEMPLATES.some((t) => t.id === p.template)) delete p.template;
    if (p.format && !FORMATS[p.format as FormatId]) delete p.format;
    return { template: p.template, format: p.format, palette: p.palette ?? {}, show: p.show };
  } catch {
    return {};
  }
}

export function FlyerStudio() {
  usePageTitle('Estudio de flyers — Admin');
  const [params] = useSearchParams();
  const demo = import.meta.env.DEV && params.get('demo') === '1';

  const [opts, setOpts] = useState<FlyerOptions>(() => ({ ...defaultOptions(), ...loadPrefs(), customBg: null }));
  const [torneo, setTorneo] = useState('');
  const [fechaId, setFechaId] = useState('');
  const [clashId, setClashId] = useState('');
  const [bgName, setBgName] = useState<string | null>(null);
  const [bgError, setBgError] = useState<string | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const tournamentsQ = useTournaments();
  const demoMemo = useMemo(() => (demo ? demoData() : null), [demo]);
  const tournaments = demoMemo?.tournaments ?? tournamentsQ.data ?? [];
  const activeSlug = torneo || tournaments[0]?.slug || '';
  const roundsQ = useFixtureRounds(demo ? '' : activeSlug);
  const rounds: FixtureRound[] = demoMemo?.rounds ?? roundsQ.data ?? [];
  const round = rounds.find((r) => r.id === fechaId) ?? rounds[0];
  const clash: FixtureClash | undefined = round?.matches.find((m) => m.id === clashId) ?? round?.matches.find((m) => m.isSoler) ?? round?.matches[0];
  const tournamentName = tournaments.find((t) => t.slug === activeSlug)?.name ?? '';

  const content: FlyerContent | null = useMemo(() => {
    if (!round || !clash || !tournamentName) return null;
    try {
      return contentFromPublicRound(tournamentName, round, clash);
    } catch {
      return null;
    }
  }, [round, clash, tournamentName]);

  useEffect(() => {
    try {
      const { customBg: _bg, ...rest } = opts;
      void _bg;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rest));
    } catch {
      /* almacenamiento no disponible */
    }
  }, [opts]);

  // Vista previa en vivo (mismo renderer que la exportación).
  useEffect(() => {
    if (!content || !canvasRef.current) return;
    let alive = true;
    setRendering(true);
    setRenderError(null);
    const timer = setTimeout(() => {
      renderFlyerCanvas(content, opts)
        .then((full) => {
          if (!alive || !canvasRef.current) return;
          const view = canvasRef.current;
          view.width = full.width;
          view.height = full.height;
          const g = view.getContext('2d');
          if (g) g.drawImage(full, 0, 0);
        })
        .catch(() => {
          if (alive) setRenderError('No se pudo generar la vista previa.');
        })
        .finally(() => {
          if (alive) setRendering(false);
        });
    }, 180);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [content, opts]);

  const patch = (p: Partial<FlyerOptions>) => setOpts((o) => ({ ...o, ...p }));

  const onBgFile = (file: File | undefined) => {
    setBgError(null);
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setBgError('El archivo debe ser una imagen.');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setBgError('La imagen no puede superar 8 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        patch({ customBg: reader.result });
        setBgName(file.name);
      }
    };
    reader.readAsDataURL(file);
  };

  const download = async () => {
    if (!content) return;
    setDownloading(true);
    try {
      const blob = await exportFlyerPng(content, opts);
      downloadBlob(blob, flyerFileName(content, opts));
    } catch {
      setRenderError('No se pudo generar el PNG.');
    } finally {
      setDownloading(false);
    }
  };

  const spec = FORMATS[opts.format];

  return (
    <AdminPage title="Estudio de flyers" desc="Partido real del fixture + plantilla + formato. La vista previa es idéntica al PNG exportado.">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <Panel
          title="Vista previa"
          action={
            <span className="text-sm text-ink-muted">
              {spec.w}×{spec.h}
            </span>
          }
        >
          {content ? (
            <>
              <div className="flex justify-center rounded-card bg-black/[0.04] p-4">
                <canvas
                  ref={canvasRef}
                  role="img"
                  aria-label={`Vista previa del flyer ${opts.template} en formato ${opts.format}`}
                  className="h-auto w-full max-w-[360px] rounded-card shadow-lift"
                />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  onClick={download}
                  disabled={downloading || rendering}
                  className="inline-flex h-11 items-center gap-2 rounded-card bg-primary px-5 font-bold text-white hover:bg-primary-hover disabled:opacity-60"
                >
                  <Download size={17} />
                  {downloading ? 'Generando PNG…' : 'Descargar PNG'}
                </button>
                {rendering && <span className="text-sm text-ink-muted">Actualizando…</span>}
              </div>
              {renderError && (
                <p role="alert" className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                  <TriangleAlert size={15} /> {renderError}
                </p>
              )}
              <p className="mt-2 break-all text-xs text-ink-muted">{content && flyerFileName(content, opts)}</p>
            </>
          ) : (
            <p className="text-sm text-ink-muted">
              {tournamentsQ.isPending || roundsQ.isPending ? 'Cargando fixture…' : 'Sin datos: publicá una fecha en el fixture o usá ?demo=1 en desarrollo.'}
            </p>
          )}
        </Panel>

        <div className="grid content-start gap-4">
          <Panel title="Partido">
            {demo && <p className="mb-2 text-xs font-bold text-primary">MODO DEMO — datos de prueba, no oficiales.</p>}
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Torneo">
                <select className={inputCls} value={activeSlug} onChange={(e) => { setTorneo(e.target.value); setFechaId(''); setClashId(''); }} disabled={demo}>
                  {tournaments.map((t) => <option key={t.id} value={t.slug}>{t.name}</option>)}
                </select>
              </Field>
              <Field label="Fecha">
                <select className={inputCls} value={round?.id ?? ''} onChange={(e) => { setFechaId(e.target.value); setClashId(''); }}>
                  {rounds.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                </select>
              </Field>
              <Field label="Partido">
                <select className={inputCls} value={clash?.id ?? ''} onChange={(e) => setClashId(e.target.value)}>
                  {(round?.matches ?? []).map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.home.shortName} vs {m.away.shortName}{m.isSoler ? ' ★' : ''}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </Panel>

          <Panel title="Plantilla">
            <div className="grid gap-2 sm:grid-cols-3">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => patch({ template: t.id as TemplateId })}
                  aria-pressed={opts.template === t.id}
                  className={`rounded-card border p-3 text-left ${opts.template === t.id ? 'border-primary bg-primary-soft' : 'border-line bg-white'}`}
                >
                  <span className="block font-display text-xl font-extrabold uppercase">{t.label}</span>
                  <span className="mt-1 block text-xs text-ink-muted">{t.hint}</span>
                </button>
              ))}
            </div>
          </Panel>

          <Panel title="Formato">
            <div className="flex flex-wrap gap-2">
              {(Object.keys(FORMATS) as FormatId[]).map((f) => (
                <button
                  key={f}
                  onClick={() => patch({ format: f })}
                  aria-pressed={opts.format === f}
                  className={`rounded-card border px-4 py-2.5 text-sm font-bold ${opts.format === f ? 'border-primary bg-primary-soft text-primary' : 'border-line bg-white'}`}
                >
                  {FORMATS[f].label}
                  <span className="ml-2 font-normal text-ink-muted">{FORMATS[f].w}×{FORMATS[f].h}</span>
                </button>
              ))}
            </div>
          </Panel>

          <Panel
            title="Colores institucionales"
            action={
              <button onClick={() => patch({ palette: {} })} className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
                <RotateCcw size={14} /> Restablecer
              </button>
            }
          >
            <div className="grid gap-3 sm:grid-cols-3">
              {(['primary', 'accent', 'bg'] as const).map((k) => (
                <Field label={k === 'primary' ? 'Principal' : k === 'accent' ? 'Acento' : 'Fondo'} key={k}>
                  <span className="flex items-center gap-2">
                    <input
                      type="color"
                      value={opts.palette[k] ?? (k === 'primary' ? '#B8202D' : k === 'accent' ? '#D3AC45' : '#0B0C11')}
                      onChange={(e) => patch({ palette: { ...opts.palette, [k]: e.target.value } })}
                      className="h-11 w-14 cursor-pointer rounded-card border border-line bg-white"
                      aria-label={`Color ${k}`}
                    />
                    <code className="text-xs text-ink-muted">{opts.palette[k] ?? 'auto'}</code>
                  </span>
                </Field>
              ))}
            </div>
          </Panel>

          <Panel title="Contenido visible">
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {(['day', 'round', 'venue', 'footer'] as const).map((k) => (
                <label key={k} className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold">
                  <input
                    type="checkbox"
                    checked={opts.show[k]}
                    onChange={(e) => patch({ show: { ...opts.show, [k]: e.target.checked } })}
                    className="h-5 w-5 accent-[#B8202D]"
                  />
                    {k === 'day' ? 'Día y fecha' : k === 'round' ? 'N° de fecha' : k === 'venue' ? 'Sede' : 'Pie institucional'}
                </label>
              ))}
            </div>
          </Panel>

          <Panel title="Fondo personalizado">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onBgFile(e.target.files?.[0])} />
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => fileRef.current?.click()} className="inline-flex h-11 items-center gap-2 rounded-card border border-line bg-white px-4 text-sm font-bold">
                <ImagePlus size={16} /> {bgName ? 'Cambiar imagen' : 'Subir imagen de fondo'}
              </button>
              {opts.customBg && (
                <button onClick={() => { patch({ customBg: null }); setBgName(null); }} className="inline-flex h-11 items-center rounded-card border border-line px-4 text-sm font-semibold">
                  Quitar
                </button>
              )}
            </div>
            {bgName && <p className="mt-2 text-xs text-ink-muted">{bgName} (cubre el fondo de la plantilla, se oscurece para legibilidad)</p>}
            {bgError && <p role="alert" className="mt-2 text-sm font-semibold text-primary">{bgError}</p>}
          </Panel>
        </div>
      </div>
    </AdminPage>
  );
}
