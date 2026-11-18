/**
 * Estudio de flyers (admin): partido real del fixture + sistema configurable.
 * Secciones colapsables, edición visual sobre la vista previa (arrastrar para
 * mover, doble clic para centrar) y presets reutilizables. La vista previa es
 * idéntica al PNG exportado (mismo renderer).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Download, ImagePlus, RotateCcw } from 'lucide-react';
import { AdminPage, Field, Panel, inputCls } from '../../admin/components';
import { usePageTitle } from '../../../lib/usePageTitle';
import { useFixtureRounds, useTournaments } from '../../fixtures/useFixture';
import { contentFromPublicRound } from '../content';
import { downloadBlob, exportFlyerPng, loadProcessedCrest, renderFlyerDetailed } from '../engine';
import { loadImageCached } from '../assets';
import {
  FORMATS,
  TEMPLATES,
  defaultOptions,
  flyerFileName,
  type Composition,
  type CrestTreatment,
  type DateStyle,
  type Density,
  type FlyerContent,
  type FlyerOptions,
  type FormatId,
  type Intensity,
  type LayoutTuning,
  type ScheduleVariant,
  type TemplateId,
  type TypographyTuning,
} from '../types';
import type { FixtureClash, FixtureRound } from '../../../types';

const STORAGE_KEY = 'csd-flyer-studio-v2';
const PRESETS_KEY = 'csd-flyer-presets-v1';

type BlockId = 'header' | 'matchup' | 'schedule' | 'footer';

const DATE_STYLES: { id: DateStyle; label: string; hint: string }[] = [
  { id: 'long', label: 'Larga', hint: 'Sábado 21 de noviembre' },
  { id: 'short', label: 'Corta', hint: '21/11/2026' },
  { id: 'both', label: 'Ambas', hint: 'Larga + corta' },
];

const CREST_TREATMENTS: { id: CrestTreatment; label: string; hint: string }[] = [
  { id: 'auto', label: 'Auto', hint: 'Sin contenedor' },
  { id: 'bare', label: 'Sin contenedor', hint: 'Escudo libre, máximo protagonismo' },
  { id: 'original', label: 'Original', hint: 'Sin modificaciones' },
  { id: 'none', label: 'Sombra suave', hint: 'Realce sutil sin encerrar' },
  { id: 'ring', label: 'Contorno', hint: 'Anillo fino, interior transparente' },
  { id: 'glow', label: 'Glow institucional', hint: 'Resplandor sin encerrar' },
  { id: 'plate', label: 'Placa sutil', hint: 'Soporte minimal en tono' },
  { id: 'card', label: 'Tarjeta', hint: 'Tarjeta institucional' },
  { id: 'crop', label: 'Recortado', hint: 'Recorta márgenes, sin contenedor' },
  { id: 'circle', label: 'Círculo', hint: 'Aro clásico (opcional)' },
];

const SCHEDULE_VARIANTS: { id: ScheduleVariant; label: string }[] = [
  { id: 'auto', label: 'Auto' },
  { id: 'compact', label: 'Compacta' },
  { id: 'compact2', label: 'Compacta 2 col' },
  { id: 'list', label: 'Lista' },
  { id: 'columns', label: 'Columnas' },
  { id: 'cards', label: 'Tarjetas' },
  { id: 'table', label: 'Tabla' },
];

const SCHEDULE_COLS: { id: number; label: string }[] = [
  { id: 0, label: 'Auto' },
  { id: 1, label: '1 columna' },
  { id: 2, label: '2 columnas' },
];

const COMPOSITIONS: { id: Composition; label: string }[] = [
  { id: 'center', label: 'Centrada' },
  { id: 'compact', label: 'Compacta' },
  { id: 'asymmetric', label: 'Asimétrica' },
  { id: 'impact', label: 'Impact' },
];

const INTENSITIES: { id: Intensity; label: string }[] = [
  { id: 'low', label: 'Sobria' },
  { id: 'medium', label: 'Media' },
  { id: 'high', label: 'Alta' },
];

const DENSITIES: { id: Density; label: string; hint: string }[] = [
  { id: 'compact', label: 'Compacto', hint: 'Menor separación, mayor aprovechamiento' },
  { id: 'balanced', label: 'Equilibrado', hint: 'Distribución estándar' },
  { id: 'airy', label: 'Amplio', hint: 'Mayor aire entre bloques' },
];

const SHOW_LABELS: { key: keyof FlyerOptions['show']; label: string }[] = [
  { key: 'tournament', label: 'Torneo' },
  { key: 'round', label: 'N° de fecha' },
  { key: 'day', label: 'Fecha' },
  { key: 'venue', label: 'Sede' },
  { key: 'homeAway', label: 'Local/visitante' },
  { key: 'slogan', label: 'Pie institucional' },
  { key: 'web', label: 'Web' },
];

const WEIGHTS: { id: 600 | 700 | 800; label: string }[] = [
  { id: 600, label: 'Semi' },
  { id: 700, label: 'Bold' },
  { id: 800, label: 'Extra' },
];

const ALIGNS: { id: TypographyTuning['align']; label: string }[] = [
  { id: 'auto', label: 'Auto' },
  { id: 'center', label: 'Centrada' },
  { id: 'left', label: 'Izquierda' },
];

interface Preset {
  name: string;
  opts: FlyerOptions;
}

function loadPrefs(): Partial<FlyerOptions> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem('csd-flyer-studio-v1');
    if (!raw) return {};
    const p = JSON.parse(raw) as Partial<FlyerOptions>;
    const d = defaultOptions();
    const out: Partial<FlyerOptions> = {};
    if (p.template && TEMPLATES.some((t) => t.id === p.template)) out.template = p.template;
    if (p.format && FORMATS[p.format as FormatId]) out.format = p.format;
    if (p.palette) out.palette = p.palette;
    if (p.show) out.show = { ...d.show, ...p.show };
    if (p.dateStyle && DATE_STYLES.some((x) => x.id === p.dateStyle)) out.dateStyle = p.dateStyle;
    if (p.crest && CREST_TREATMENTS.some((c) => c.id === p.crest)) out.crest = p.crest;
    if (p.schedule && SCHEDULE_VARIANTS.some((s) => s.id === p.schedule)) out.schedule = p.schedule;
    if (p.composition && COMPOSITIONS.some((c) => c.id === p.composition)) out.composition = p.composition;
    if (p.intensity && INTENSITIES.some((i) => i.id === p.intensity)) out.intensity = p.intensity;
    if (p.density && DENSITIES.some((x) => x.id === p.density)) out.density = p.density;
    if (typeof p.removeWhite === 'boolean') out.removeWhite = p.removeWhite;
    if (typeof p.removeWhiteTol === 'number') out.removeWhiteTol = p.removeWhiteTol;
    if (p.layout) {
      const clean: Record<string, number> = {};
      for (const [k, v] of Object.entries(p.layout)) {
        if (typeof v === 'number' && Number.isFinite(v)) clean[k] = v;
      }
      out.layout = { ...d.layout, ...clean };
    }
    if (p.typography) {
      const t = p.typography as Partial<TypographyTuning>;
      const clean: Record<string, number | string> = {};
      for (const [k, v] of Object.entries(t)) {
        if (typeof v === 'number' && Number.isFinite(v)) clean[k] = v;
      }
      const base: TypographyTuning = { ...d.typography, ...clean };
      if (t.weight === 600 || t.weight === 700 || t.weight === 800) base.weight = t.weight;
      if (t.align === 'auto' || t.align === 'center' || t.align === 'left') base.align = t.align;
      out.typography = base;
    }
    return out;
  } catch {
    return {};
  }
}

function loadPresets(): Preset[] {
  try {
    const raw = localStorage.getItem(PRESETS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as Preset[];
    return Array.isArray(arr) ? arr.filter((p) => p && typeof p.name === 'string' && p.opts) : [];
  } catch {
    return [];
  }
}

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

function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: readonly { id: T; label: string; hint?: string }[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel: string;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={ariaLabel}>
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          aria-pressed={value === o.id}
          title={o.hint}
          className={`rounded-card border px-4 py-2.5 text-sm font-bold ${value === o.id ? 'border-primary bg-primary-soft text-primary' : 'border-line bg-white'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Slider({
  label,
  min,
  max,
  step,
  value,
  unit,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  unit: '%' | 'px' | 'raw';
  onChange: (v: number) => void;
}) {
  const display = unit === 'px' ? `${value > 0 ? '+' : ''}${Math.round(value)}` : unit === 'raw' ? `${Math.round(value)}` : `${Math.round(value * 100)}%`;
  return (
    <label className="block">
      <span className="mb-1 flex items-center justify-between text-sm font-semibold">
        {label}
        <span className="font-normal tabular-nums text-ink-muted">{display}</span>
      </span>
      <input
        type="range"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[#B8202D]"
      />
    </label>
  );
}

function Section({
  title,
  hint,
  action,
  defaultOpen = false,
  children,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details open={defaultOpen || undefined} className="group rounded-card border border-line bg-white open:shadow-soft">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <span className="font-display text-xl font-extrabold uppercase">{title}</span>
        <span className="flex items-center gap-2">
          {action}
          <span aria-hidden className="text-ink-muted transition-transform group-open:rotate-180">▾</span>
        </span>
      </summary>
      <div className="border-t border-line px-4 py-3">
        {hint && <p className="mb-2 text-xs text-ink-muted">{hint}</p>}
        {children}
      </div>
    </details>
  );
}

function GroupReset({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        onClick();
      }}
      className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
    >
      <RotateCcw size={12} /> Restablecer grupo
    </button>
  );
}

function CrestCompare({ src, name, removeWhite, tol }: { src: string; name: string; removeWhite: boolean; tol: number }) {
  const origRef = useRef<HTMLCanvasElement>(null);
  const procRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      const [orig, proc] = await Promise.all([
        loadImageCached(src),
        loadProcessedCrest(src, removeWhite, tol, false),
      ]);
      if (!alive) return;
      const paint = (ref: React.RefObject<HTMLCanvasElement | null>, img: HTMLImageElement | HTMLCanvasElement | null, label: string) => {
        const c = ref.current;
        if (!c || !img) return;
        const iw = img instanceof HTMLImageElement ? img.naturalWidth : img.width;
        const ih = img instanceof HTMLImageElement ? img.naturalHeight : img.height;
        const s = Math.min(1, 120 / Math.max(iw, ih));
        c.width = Math.max(1, Math.round(iw * s));
        c.height = Math.max(1, Math.round(ih * s));
        c.getContext('2d')?.drawImage(img, 0, 0, c.width, c.height);
        c.setAttribute('aria-label', label);
      };
      paint(origRef, orig, `${name} original`);
      paint(procRef, proc, `${name} procesado`);
    })();
    return () => {
      alive = false;
    };
  }, [src, name, removeWhite, tol]);
  const checker: React.CSSProperties = {
    backgroundImage: 'conic-gradient(#d4d4d4 25%, #ffffff 0 50%, #d4d4d4 0 75%, #ffffff 0)',
    backgroundSize: '14px 14px',
  };
  return (
    <figure className="inline-flex flex-col items-center gap-1">
      <span className="max-w-28 truncate text-xs font-semibold">{name}</span>
      <span className="flex items-center gap-2">
        <span className="flex flex-col items-center gap-1">
          <canvas ref={origRef} style={checker} className="h-16 w-auto rounded border border-line" />
          <span className="text-[11px] text-ink-muted">Original</span>
        </span>
        <span aria-hidden className="text-ink-muted">→</span>
        <span className="flex flex-col items-center gap-1">
          <canvas ref={procRef} style={checker} className="h-16 w-auto rounded border border-line" />
          <span className="text-[11px] text-ink-muted">Procesado</span>
        </span>
      </span>
    </figure>
  );
}

/** Zonas de bloques como fracción de la altura (selección visual). */
function zoneAt(y01: number): BlockId {
  if (y01 < 0.32) return 'header';
  if (y01 < 0.63) return 'matchup';
  if (y01 < 0.9) return 'schedule';
  return 'footer';
}

function zoneRect(zone: BlockId, w: number, h: number): [number, number, number, number] {
  switch (zone) {
    case 'header':
      return [8, 8, w - 16, h * 0.32 - 16];
    case 'matchup':
      return [8, h * 0.32, w - 16, h * 0.31];
    case 'schedule':
      return [8, h * 0.63, w - 16, h * 0.27];
    case 'footer':
      return [8, h * 0.9, w - 16, h * 0.1 - 8];
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
  const [hiddenRows, setHiddenRows] = useState(0);
  const [sel, setSel] = useState<BlockId | null>(null);
  const [dragging, setDragging] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [presets, setPresets] = useState<Preset[]>(() => loadPresets());
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const miniRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<{ block: BlockId; startX: number; startY: number; dx0: number; dy0: number } | null>(null);

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

  // Vista previa en vivo (mismo renderer que la exportación) + guías del bloque.
  useEffect(() => {
    if (!content || !canvasRef.current) return;
    let alive = true;
    setRendering(true);
    setRenderError(null);
    const timer = setTimeout(() => {
      renderFlyerDetailed(content, opts)
        .then(({ canvas: full, hidden }) => {
          if (!alive || !canvasRef.current) return;
          const view = canvasRef.current;
          view.width = full.width;
          view.height = full.height;
          const g = view.getContext('2d');
          if (!g) return;
          g.drawImage(full, 0, 0);
          setHiddenRows(hidden);
          if (sel) {
            const [zx, zy, zw, zh] = zoneRect(sel, view.width, view.height);
            g.save();
            g.strokeStyle = '#FFC93C';
            g.lineWidth = Math.max(3, view.width * 0.004);
            g.setLineDash([18, 12]);
            g.strokeRect(zx, zy, zw, zh);
            g.setLineDash([]);
            g.globalAlpha = 0.7;
            g.strokeStyle = '#FFC93C';
            g.lineWidth = 2;
            g.beginPath();
            g.moveTo(view.width / 2, 0);
            g.lineTo(view.width / 2, view.height);
            g.stroke();
            g.restore();
          }
          if (miniRef.current) {
            const mini = miniRef.current;
            const mh = 44;
            const mw = Math.round((mh * full.width) / full.height);
            mini.width = mw;
            mini.height = mh;
            mini.getContext('2d')?.drawImage(full, 0, 0, mw, mh);
          }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, opts, sel, dragging]);

  const patch = (p: Partial<FlyerOptions>) => setOpts((o) => ({ ...o, ...p }));
  const patchLayout = (p: Partial<LayoutTuning>) => setOpts((o) => ({ ...o, layout: { ...o.layout, ...p } }));
  const patchType = (p: Partial<TypographyTuning>) => setOpts((o) => ({ ...o, typography: { ...o.typography, ...p } }));
  const resetLayout = (keys: (keyof LayoutTuning)[]) => {
    const d = defaultOptions().layout;
    const clean: Partial<LayoutTuning> = {};
    for (const k of keys) clean[k] = d[k];
    patchLayout(clean);
  };
  const L = opts.layout;
  const T = opts.typography;

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

  const savePreset = () => {
    const name = presetName.trim();
    if (!name || !content) return;
    const { customBg: _bg, ...rest } = opts;
    void _bg;
    const next = [...presets.filter((p) => p.name !== name), { name, opts: { ...rest, customBg: null } as FlyerOptions }];
    setPresets(next);
    try {
      localStorage.setItem(PRESETS_KEY, JSON.stringify(next));
    } catch {
      /* nada */
    }
    setPresetName('');
  };

  const applyPreset = (p: Preset) => {
    setOpts({ ...defaultOptions(), ...p.opts, customBg: null });
    setBgName(null);
  };

  const deletePreset = (name: string) => {
    const next = presets.filter((p) => p.name !== name);
    setPresets(next);
    try {
      localStorage.setItem(PRESETS_KEY, JSON.stringify(next));
    } catch {
      /* nada */
    }
  };

  const resetAll = () => {
    setOpts({ ...defaultOptions(), customBg: null });
    setBgName(null);
    setSel(null);
  };

  // --- Edición visual: arrastrar bloques sobre la vista previa ---
  const blockOffset = (b: BlockId): [number, number] => {
    switch (b) {
      case 'header':
        return [L.headerDx, L.headerDy];
      case 'matchup':
        return [L.matchupDx, L.matchupDy];
      case 'schedule':
        return [0, L.scheduleDy];
      case 'footer':
        return [0, L.footerDy];
    }
  };

  const applyOffset = (b: BlockId, dx: number, dy: number) => {
    const cx = Math.max(-200, Math.min(200, Math.round(dx)));
    const cy = Math.max(-200, Math.min(200, Math.round(dy)));
    switch (b) {
      case 'header':
        patchLayout({ headerDx: cx, headerDy: cy });
        break;
      case 'matchup':
        patchLayout({ matchupDx: cx, matchupDy: cy });
        break;
      case 'schedule':
        patchLayout({ scheduleDy: cy });
        break;
      case 'footer':
        patchLayout({ footerDy: cy });
        break;
    }
  };

  const resetBlock = (b: BlockId) => {
    const d = defaultOptions().layout;
    switch (b) {
      case 'header':
        patchLayout({ headerDx: d.headerDx, headerDy: d.headerDy });
        break;
      case 'matchup':
        patchLayout({ matchupDx: d.matchupDx, matchupDy: d.matchupDy });
        break;
      case 'schedule':
        patchLayout({ scheduleDy: d.scheduleDy });
        break;
      case 'footer':
        patchLayout({ footerDy: d.footerDy });
        break;
    }
  };

  const onPreviewDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !content) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0) return;
    const scale = canvas.width / rect.width;
    const bx = (e.clientX - rect.left) * scale;
    const by = (e.clientY - rect.top) * scale;
    const zone = zoneAt(by / canvas.height);
    void bx;
    setSel(zone);
    const [dx0, dy0] = blockOffset(zone);
    dragRef.current = { block: zone, startX: e.clientX, startY: e.clientY, dx0, dy0 };
    canvas.setPointerCapture(e.pointerId);
    setDragging(true);
  };

  const onPreviewMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    const canvas = canvasRef.current;
    if (!drag || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scale = canvas.width / rect.width;
    let ndx = drag.dx0 + (e.clientX - drag.startX) * scale;
    let ndy = drag.dy0 + (e.clientY - drag.startY) * scale;
    if (Math.abs(ndx) < 10) ndx = 0;
    applyOffset(drag.block, ndx, ndy);
  };

  const endDrag = () => {
    dragRef.current = null;
    setDragging(false);
  };

  const spec = FORMATS[opts.format];

  return (
    <AdminPage title="Estudio de flyers" desc="Partido real del fixture + sistema configurable. La vista previa es idéntica al PNG exportado. Arrastrá bloques sobre la vista previa para moverlos; doble clic para centrar.">
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {/* Barra compacta móvil al pie: preview + descarga sin tapar controles */}
        <div className="sticky bottom-3 z-20 order-last min-w-0 rounded-card border border-line bg-white/95 px-3 py-2 shadow-lift backdrop-blur lg:hidden">
          <div className="flex items-center gap-3">
            <canvas ref={miniRef} aria-hidden className="h-11 w-auto rounded border border-line" />
            <span className="min-w-0 flex-1 truncate text-xs font-semibold text-ink-muted">
              {content ? flyerFileName(content, opts) : 'Estudio de flyers'}
            </span>
            <button
              onClick={download}
              disabled={!content || downloading || rendering}
              aria-label="Descarga rápida PNG"
              className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-card bg-primary px-4 text-sm font-bold text-white disabled:opacity-60"
            >
              <Download size={16} />
              PNG
            </button>
          </div>
        </div>
        <div className="lg:sticky lg:top-4 lg:self-start">
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
                  title="Arrastrá un bloque para moverlo · doble clic para centrarlo"
                  onPointerDown={onPreviewDown}
                  onPointerMove={onPreviewMove}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
                  onDoubleClick={() => sel && resetBlock(sel)}
                  className="h-auto touch-none rounded-card shadow-lift"
                  style={{ width: `min(100%, 360px, calc((100vh - 330px) * ${spec.w / spec.h}))`, cursor: dragging ? 'grabbing' : 'move' }}
                />
              </div>
              {sel && (
                <p className="mt-2 text-xs text-ink-muted" aria-live="polite">
                  Bloque seleccionado: <strong>{sel === 'header' ? 'encabezado' : sel === 'matchup' ? 'partido' : sel === 'schedule' ? 'horarios' : 'pie'}</strong> — arrastrá para moverlo, doble clic para centrarlo.
                </p>
              )}
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
              {hiddenRows > 0 && (
                <p role="alert" className="mt-2 text-[13px] font-semibold text-primary">
                  {hiddenRows} {hiddenRows === 1 ? 'categoría resumida' : 'categorías resumidas'} (+{hiddenRows}): probá variante Columnas/Tarjetas, composición Compacta o densidad Compacto.
                </p>
              )}
              {renderError && (
                <p role="alert" className="mt-2 text-sm font-semibold text-primary">
                  {renderError}
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
        </div>

        <div className="grid content-start gap-3">
          <Section title="Partido" defaultOpen hint={demo ? 'MODO DEMO — datos de prueba, no oficiales.' : undefined}>
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
          </Section>

          <Section title="Plantilla y formato" defaultOpen>
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
            <div className="mt-3">
              <Segmented
                ariaLabel="Formato de exportación"
                value={opts.format}
                onChange={(v: FormatId) => patch({ format: v })}
                options={(Object.keys(FORMATS) as FormatId[]).map((f) => ({ id: f, label: `${FORMATS[f].label} ${FORMATS[f].w}×${FORMATS[f].h}` }))}
              />
            </div>
          </Section>

          <Section title="Contenido">
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {SHOW_LABELS.map(({ key, label }) => (
                <label key={key} className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold">
                  <input
                    type="checkbox"
                    checked={opts.show[key]}
                    onChange={(e) => patch({ show: { ...opts.show, [key]: e.target.checked } })}
                    className="h-5 w-5 accent-[#B8202D]"
                  />
                  {label}
                </label>
              ))}
            </div>
          </Section>

          <Section title="Fecha" hint="Por defecto solo el formato largo (sin duplicar).">
            <Segmented ariaLabel="Formato de fecha" value={opts.dateStyle} onChange={(v: DateStyle) => patch({ dateStyle: v })} options={DATE_STYLES} />
          </Section>

          <Section title="Escudos" hint="Sin fondo blanco por defecto. Para PNG transparentes usá Transparente u Original; para JPG con fondo, Quitar fondo o Placa/Tarjeta.">
            <Segmented ariaLabel="Tratamiento del escudo" value={opts.crest} onChange={(v: CrestTreatment) => patch({ crest: v })} options={CREST_TREATMENTS} />
            <label className="mt-3 inline-flex cursor-pointer items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={opts.removeWhite}
                onChange={(e) => patch({ removeWhite: e.target.checked })}
                className="h-5 w-5 accent-[#B8202D]"
              />
              Quitar fondo blanco automáticamente
            </label>
            {opts.removeWhite && (
              <div className="mt-2 flex flex-col gap-3">
                <div className="max-w-xs">
                  <Slider label="Tolerancia" min={10} max={60} step={1} value={opts.removeWhiteTol} unit="raw" onChange={(v) => patch({ removeWhiteTol: Math.round(v) })} />
                </div>
                {content && (
                  <div className="flex flex-wrap gap-4">
                    {content.homeCrest && <CrestCompare src={content.homeCrest} name={content.homeName} removeWhite={opts.removeWhite} tol={opts.removeWhiteTol} />}
                    {content.awayCrest && <CrestCompare src={content.awayCrest} name={content.awayName} removeWhite={opts.removeWhite} tol={opts.removeWhiteTol} />}
                  </div>
                )}
              </div>
            )}
          </Section>

          <Section title="Horarios" hint="Auto reacomoda (lista → columnas) para mostrar todas las categorías antes de resumir.">
            <Segmented ariaLabel="Variante de horarios" value={opts.schedule} onChange={(v: ScheduleVariant) => patch({ schedule: v })} options={SCHEDULE_VARIANTS} />
            <div className="mt-3">
              <Segmented
                ariaLabel="Columnas de horarios"
                value={opts.layout.scheduleCols}
                onChange={(v: number) => patchLayout({ scheduleCols: v })}
                options={SCHEDULE_COLS}
              />
            </div>
          </Section>

          <Section title="Diseño">
            <p className="mb-1 text-xs font-bold uppercase text-ink-muted">Composición</p>
            <Segmented ariaLabel="Composición" value={opts.composition} onChange={(v: Composition) => patch({ composition: v })} options={COMPOSITIONS} />
            <p className="mb-1 mt-3 text-xs font-bold uppercase text-ink-muted">Intensidad</p>
            <Segmented ariaLabel="Intensidad visual" value={opts.intensity} onChange={(v: Intensity) => patch({ intensity: v })} options={INTENSITIES} />
            <p className="mb-1 mt-3 text-xs font-bold uppercase text-ink-muted">Densidad</p>
            <Segmented ariaLabel="Densidad del diseño" value={opts.density} onChange={(v: Density) => patch({ density: v })} options={DENSITIES} />
          </Section>

          <Section title="Ajustar diseño" hint="Fino por bloque. También podés arrastrar bloques sobre la vista previa." action={<GroupReset onClick={() => patch({ layout: defaultOptions().layout })} />}>
            <div className="grid gap-4">
              <fieldset>
                <legend className="mb-1 flex w-full items-center justify-between text-xs font-bold uppercase text-ink-muted">
                  Encabezado <GroupReset onClick={() => resetLayout(['headerScale', 'headerDx', 'headerDy'])} />
                </legend>
                <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                  <Slider label="Escala encabezado" min={0.8} max={1.3} step={0.05} value={L.headerScale} unit="%" onChange={(v) => patchLayout({ headerScale: v })} />
                  <Slider label="Posición horizontal" min={-120} max={120} step={4} value={L.headerDx} unit="px" onChange={(v) => patchLayout({ headerDx: v })} />
                  <Slider label="Posición vertical" min={-120} max={120} step={4} value={L.headerDy} unit="px" onChange={(v) => patchLayout({ headerDy: v })} />
                </div>
              </fieldset>
              <fieldset>
                <legend className="mb-1 flex w-full items-center justify-between text-xs font-bold uppercase text-ink-muted">
                  Fecha y jornada <GroupReset onClick={() => resetLayout(['dateDy'])} />
                </legend>
                <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                  <Slider label="Posición fecha" min={-120} max={120} step={4} value={L.dateDy} unit="px" onChange={(v) => patchLayout({ dateDy: v })} />
                </div>
                <p className="mt-1 text-xs text-ink-muted">Tamaños en sección Fecha y en Tipografía.</p>
              </fieldset>
              <fieldset>
                <legend className="mb-1 flex w-full items-center justify-between text-xs font-bold uppercase text-ink-muted">
                  Enfrentamiento <GroupReset onClick={() => resetLayout(['crestHome', 'crestAway', 'crestGap', 'matchupScale', 'matchupDx', 'matchupDy', 'vsScale'])} />
                </legend>
                <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                  <Slider label="Escudo local" min={0.7} max={1.4} step={0.05} value={L.crestHome} unit="%" onChange={(v) => patchLayout({ crestHome: v })} />
                  <Slider label="Escudo visitante" min={0.7} max={1.4} step={0.05} value={L.crestAway} unit="%" onChange={(v) => patchLayout({ crestAway: v })} />
                  <Slider label="Tamaño escudos" min={0.7} max={1.4} step={0.05} value={L.crestScale} unit="%" onChange={(v) => patchLayout({ crestScale: v })} />
                  <Slider label="Separación escudos" min={-100} max={100} step={4} value={L.crestGap} unit="px" onChange={(v) => patchLayout({ crestGap: v })} />
                  <Slider label="Escala partido" min={0.8} max={1.3} step={0.05} value={L.matchupScale} unit="%" onChange={(v) => patchLayout({ matchupScale: v })} />
                  <Slider label="Tamaño VS" min={0.7} max={1.5} step={0.05} value={L.vsScale} unit="%" onChange={(v) => patchLayout({ vsScale: v })} />
                  <Slider label="Posición horizontal" min={-120} max={120} step={4} value={L.matchupDx} unit="px" onChange={(v) => patchLayout({ matchupDx: v })} />
                  <Slider label="Posición vertical" min={-120} max={120} step={4} value={L.matchupDy} unit="px" onChange={(v) => patchLayout({ matchupDy: v })} />
                </div>
                <p className="mt-1 text-xs text-ink-muted">Nombres en sección Tipografía.</p>
              </fieldset>
              <fieldset>
                <legend className="mb-1 flex w-full items-center justify-between text-xs font-bold uppercase text-ink-muted">
                  Horarios <GroupReset onClick={() => resetLayout(['scheduleScale', 'rowScale', 'scheduleCols', 'scheduleDy'])} />
                </legend>
                <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                  <Slider label="Escala bloque" min={0.85} max={1.25} step={0.05} value={L.scheduleScale} unit="%" onChange={(v) => patchLayout({ scheduleScale: v })} />
                  <Slider label="Tamaño filas" min={0.8} max={1.3} step={0.05} value={L.rowScale} unit="%" onChange={(v) => patchLayout({ rowScale: v })} />
                  <Slider label="Posición vertical" min={-120} max={120} step={4} value={L.scheduleDy} unit="px" onChange={(v) => patchLayout({ scheduleDy: v })} />
                </div>
              </fieldset>
              <fieldset>
                <legend className="mb-1 flex w-full items-center justify-between text-xs font-bold uppercase text-ink-muted">
                  Pie <GroupReset onClick={() => resetLayout(['footerScale', 'footerDy'])} />
                </legend>
                <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                  <Slider label="Tamaño pie" min={0.8} max={1.3} step={0.05} value={L.footerScale} unit="%" onChange={(v) => patchLayout({ footerScale: v })} />
                  <Slider label="Posición vertical" min={-120} max={120} step={4} value={L.footerDy} unit="px" onChange={(v) => patchLayout({ footerDy: v })} />
                </div>
              </fieldset>
              <fieldset>
                <legend className="mb-1 flex w-full items-center justify-between text-xs font-bold uppercase text-ink-muted">
                  General <GroupReset onClick={() => resetLayout(['separation'])} />
                </legend>
                <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                  <Slider label="Separación bloques" min={-80} max={80} step={4} value={L.separation} unit="px" onChange={(v) => patchLayout({ separation: v })} />
                </div>
              </fieldset>
            </div>
          </Section>

          <Section title="Tipografía" hint="Multiplicadores sobre los tamaños de cada plantilla. Peso 600/700/800 según la fuente cargada.">
            <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              <Slider label="Títulos" min={0.8} max={1.4} step={0.05} value={T.title} unit="%" onChange={(v) => patchType({ title: v })} />
              <Slider label="Nombres de equipos" min={0.8} max={1.4} step={0.05} value={T.names} unit="%" onChange={(v) => patchType({ names: v })} />
              <Slider label="N° de fecha" min={0.8} max={1.4} step={0.05} value={T.dateNum} unit="%" onChange={(v) => patchType({ dateNum: v })} />
              <Slider label="Texto de fecha" min={0.8} max={1.4} step={0.05} value={T.dateText} unit="%" onChange={(v) => patchType({ dateText: v })} />
              <Slider label="Categorías" min={0.8} max={1.4} step={0.05} value={T.category} unit="%" onChange={(v) => patchType({ category: v })} />
              <Slider label="Horarios" min={0.8} max={1.4} step={0.05} value={T.time} unit="%" onChange={(v) => patchType({ time: v })} />
              <Slider label="Espaciado letras" min={0} max={8} step={1} value={T.tracking} unit="raw" onChange={(v) => patchType({ tracking: Math.round(v) })} />
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <p className="mb-1 text-xs font-bold uppercase text-ink-muted">Peso</p>
                <Segmented ariaLabel="Peso tipográfico" value={T.weight} onChange={(v: 600 | 700 | 800) => patchType({ weight: v })} options={WEIGHTS} />
              </div>
              <div>
                <p className="mb-1 text-xs font-bold uppercase text-ink-muted">Alineación</p>
                <Segmented ariaLabel="Alineación" value={T.align} onChange={(v: TypographyTuning['align']) => patchType({ align: v })} options={ALIGNS} />
              </div>
            </div>
          </Section>

          <Section title="Colores"
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
          </Section>

          <Section title="Fondo personalizado">
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
          </Section>

          <Section title="Mis diseños" hint="Guardá la configuración actual y reutilizala en otros partidos. El partido no se guarda, solo el diseño.">
            <div className="flex flex-wrap items-end gap-2">
              <Field label="Nombre del diseño">
                <input
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  placeholder="Ej. Clásico rojo"
                  className={inputCls}
                  aria-label="Nombre del diseño"
                />
              </Field>
              <button onClick={savePreset} disabled={!presetName.trim()} className="inline-flex h-11 items-center rounded-card bg-pitch px-5 font-bold text-white disabled:opacity-50">
                Guardar actual
              </button>
              <button onClick={resetAll} className="inline-flex h-11 items-center gap-1 rounded-card border border-line px-4 text-sm font-semibold">
                <RotateCcw size={14} /> Restaurar todo
              </button>
            </div>
            {presets.length > 0 && (
              <ul className="mt-3 space-y-2">
                {presets.map((p) => (
                  <li key={p.name} className="flex items-center justify-between gap-2 rounded-card border border-line px-3 py-2">
                    <span className="truncate text-sm font-semibold">{p.name}</span>
                    <span className="flex shrink-0 gap-2">
                      <button onClick={() => applyPreset(p)} className="text-sm font-semibold text-primary hover:underline">Aplicar</button>
                      <button onClick={() => deletePreset(p.name)} className="text-sm text-ink-muted hover:underline">Eliminar</button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      </div>
    </AdminPage>
  );
}
