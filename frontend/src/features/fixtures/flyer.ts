import { clubCrest } from '../../services/api';
import type { FixtureClash, FixtureRound } from '../../types';

/**
 * Generador de flyer de fecha (historia 1080x1920) con Canvas 2D.
 * Fuente: cruce publicado del fixture — torneo, fecha, local/visitante,
 * horarios por categoría, día y sede. Sin backend adicional.
 */

export const FLYER_W = 1080;
export const FLYER_H = 1920;

export interface FlyerClubInput {
  name: string;
  shortName: string;
  crestUrl?: string | null;
  crestPath?: string | null;
  mapsUrl?: string | null;
}

export interface FlyerCategoryInput {
  categoryName: string;
  kickoff: string | null;
  venue?: string | null;
}

export interface FlyerData {
  tournamentName: string;
  roundLabel: string;
  dayTitle: string;
  daySubtitle: string;
  homeName: string;
  homeCrest: string | null;
  awayName: string;
  awayCrest: string | null;
  venue: string | null;
  rows: { category: string; time: string }[];
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function flyerFileName(data: FlyerData): string {
  return `flyer-${slugify(data.tournamentName)}-${slugify(data.roundLabel)}-${slugify(data.homeName)}-vs-${slugify(data.awayName)}.png`;
}

function timeShort(iso: string | null): string {
  if (!iso) return 'A confirmar';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'A confirmar';
  return new Intl.DateTimeFormat('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(d);
}

function dayTexts(roundDate: string | null | undefined, kickoffs: (string | null)[]): { title: string; subtitle: string } {
  const raw = roundDate ?? kickoffs.find((k) => k && !Number.isNaN(new Date(k).getTime())) ?? null;
  if (!raw) return { title: 'DÍA A CONFIRMAR', subtitle: 'Horarios sujetos a cambios' };
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return { title: 'DÍA A CONFIRMAR', subtitle: 'Horarios sujetos a cambios' };
  const title = new Intl.DateTimeFormat('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
    .format(d)
    .toUpperCase();
  const subtitle = new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
  return { title, subtitle };
}

function crestOf(club: FlyerClubInput): string | null {
  return clubCrest({ crestUrl: club.crestUrl ?? null, crestPath: club.crestPath ?? null });
}

function mainVenue(categories: FlyerCategoryInput[]): string | null {
  const counts = new Map<string, number>();
  for (const c of categories) {
    const v = (c.venue ?? '').trim();
    if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestN = 0;
  for (const [v, n] of counts) {
    if (n > bestN) {
      best = v;
      bestN = n;
    }
  }
  return best;
}

export function buildFlyerData(args: {
  tournamentName: string;
  roundLabel: string;
  roundDate?: string | null;
  home: FlyerClubInput;
  away: FlyerClubInput;
  categories: FlyerCategoryInput[];
}): FlyerData {
  const sorted = [...args.categories].sort((a, b) => {
    const ta = a.kickoff ? new Date(a.kickoff).getTime() : Number.POSITIVE_INFINITY;
    const tb = b.kickoff ? new Date(b.kickoff).getTime() : Number.POSITIVE_INFINITY;
    if (ta !== tb) return ta - tb;
    return a.categoryName.localeCompare(b.categoryName, 'es');
  });
  const { title, subtitle } = dayTexts(
    args.roundDate ?? null,
    sorted.map((c) => c.kickoff),
  );
  return {
    tournamentName: args.tournamentName,
    roundLabel: args.roundLabel,
    dayTitle: title,
    daySubtitle: subtitle,
    homeName: args.home.shortName || args.home.name,
    homeCrest: crestOf(args.home),
    awayName: args.away.shortName || args.away.name,
    awayCrest: crestOf(args.away),
    venue: mainVenue(sorted),
    rows: sorted.map((c) => ({ category: c.categoryName, time: timeShort(c.kickoff) })),
  };
}

/** Adaptador para el cruce público (GET /tournaments/:slug/fixture). */
export function flyerFromPublicRound(tournamentName: string, round: FixtureRound, clash: FixtureClash): FlyerData {
  return buildFlyerData({
    tournamentName,
    roundLabel: round.label,
    roundDate: round.date ?? null,
    home: { name: clash.home.name, shortName: clash.home.shortName, crestUrl: clash.home.crestUrl, crestPath: clash.home.crestPath, mapsUrl: clash.home.mapsUrl },
    away: { name: clash.away.name, shortName: clash.away.shortName, crestUrl: clash.away.crestUrl, crestPath: clash.away.crestPath, mapsUrl: clash.away.mapsUrl },
    categories: clash.categories.map((c) => ({ categoryName: c.categoryName, kickoff: c.kickoff, venue: c.venue })),
  });
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const timer = setTimeout(() => resolve(null), 8000);
    img.onload = () => {
      clearTimeout(timer);
      resolve(img);
    };
    img.onerror = () => {
      clearTimeout(timer);
      resolve(null);
    };
    img.src = src;
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, base: number, family: string, weight: number): number {
  let size = base;
  ctx.font = `${weight} ${size}px ${family}`;
  while (size > 20 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = `${weight} ${size}px ${family}`;
  }
  return size;
}

function drawCrest(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | null,
  cx: number,
  cy: number,
  radius: number,
  fallbackInitials: string,
) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.clip();
  const drawInitials = () => {
    ctx.fillStyle = '#171719';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `800 ${Math.round(radius * 0.7)}px "Barlow Condensed", sans-serif`;
    ctx.fillText(fallbackInitials.slice(0, 2).toUpperCase(), cx, cy + radius * 0.05);
  };
  const usable = img && img.naturalWidth > 0 && img.naturalHeight > 0;
  if (usable) {
    try {
      const pad = radius * 0.28;
      const box = (radius - pad) * 2;
      const scale = Math.min(box / (img as HTMLImageElement).naturalWidth, box / (img as HTMLImageElement).naturalHeight);
      const w = (img as HTMLImageElement).naturalWidth * scale;
      const h = (img as HTMLImageElement).naturalHeight * scale;
      ctx.drawImage(img as HTMLImageElement, cx - w / 2, cy - h / 2, w, h);
    } catch {
      drawInitials();
    }
  } else {
    drawInitials();
  }
  ctx.restore();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.lineWidth = 8;
  ctx.strokeStyle = '#D3AC45';
  ctx.stroke();
}

export async function renderFlyer(data: FlyerData): Promise<HTMLCanvasElement> {
  try {
    await (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts?.ready;
  } catch {
    /* fuentes del sistema como respaldo */
  }
  const [homeImg, awayImg] = await Promise.all([
    data.homeCrest ? loadImage(data.homeCrest) : Promise.resolve(null),
    data.awayCrest ? loadImage(data.awayCrest) : Promise.resolve(null),
  ]);

  const canvas = document.createElement('canvas');
  canvas.width = FLYER_W;
  canvas.height = FLYER_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas no disponible.');

  const DISPLAY = '"Barlow Condensed", "Arial Narrow", sans-serif';
  const SANS = 'Inter, system-ui, sans-serif';

  // Fondo
  ctx.fillStyle = '#141416';
  ctx.fillRect(0, 0, FLYER_W, FLYER_H);

  // Cabecera roja
  const headerH = 620;
  const grad = ctx.createLinearGradient(0, 0, 0, headerH);
  grad.addColorStop(0, '#C92332');
  grad.addColorStop(1, '#8E1620');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, FLYER_W, headerH);
  ctx.fillStyle = '#D3AC45';
  ctx.fillRect(0, headerH, FLYER_W, 10);

  // Marca club
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = `600 30px ${SANS}`;
  ctx.fillText('CLUB SOCIAL Y DEPORTIVO SOLER', FLYER_W / 2, 84);

  fitText(ctx, data.tournamentName.toUpperCase(), FLYER_W - 160, 104, DISPLAY, 800);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(data.tournamentName.toUpperCase(), FLYER_W / 2, 200);

  // Pastilla de fecha (Fecha N)
  const pillText = data.roundLabel.toUpperCase();
  ctx.font = `800 52px ${DISPLAY}`;
  const pillW = Math.min(FLYER_W - 200, ctx.measureText(pillText).width + 90);
  const pillX = (FLYER_W - pillW) / 2;
  roundRect(ctx, pillX, 238, pillW, 84, 42);
  ctx.fillStyle = '#141416';
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.fillText(pillText, FLYER_W / 2, 296);

  // Día
  fitText(ctx, data.dayTitle, FLYER_W - 160, 58, DISPLAY, 800);
  ctx.fillStyle = '#D3AC45';
  ctx.fillText(data.dayTitle, FLYER_W / 2, 400);
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.font = `500 36px ${SANS}`;
  ctx.fillText(data.daySubtitle, FLYER_W / 2, 452);
  if (data.venue) {
    fitText(ctx, `CANCHA: ${data.venue.toUpperCase()}`, FLYER_W - 160, 40, DISPLAY, 700);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`CANCHA: ${data.venue.toUpperCase()}`, FLYER_W / 2, 520);
  }

  // Escudos
  const cy = 880;
  drawCrest(ctx, homeImg, 300, cy, 168, data.homeName);
  drawCrest(ctx, awayImg, 780, cy, 168, data.awayName);

  ctx.fillStyle = '#D3AC45';
  ctx.font = `800 72px ${DISPLAY}`;
  ctx.fillText('VS', FLYER_W / 2, cy + 24);

  // Nombres + local/visitante
  fitText(ctx, data.homeName.toUpperCase(), 400, 56, DISPLAY, 800);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText(data.homeName.toUpperCase(), 300, 1110);
  fitText(ctx, data.awayName.toUpperCase(), 400, 56, DISPLAY, 800);
  ctx.fillText(data.awayName.toUpperCase(), 780, 1110);
  ctx.font = `700 30px ${SANS}`;
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.fillText('LOCAL', 300, 1152);
  ctx.fillText('VISITANTE', 780, 1152);

  // Tarjeta de horarios
  const cardX = 90;
  const cardW = FLYER_W - 180;
  const rows = data.rows.slice(0, 11);
  const rowH = rows.length > 8 ? 88 : 100;
  const cardH = 120 + rows.length * rowH + 28;
  const cardY = 1210;
  ctx.textAlign = 'left';
  roundRect(ctx, cardX, cardY, cardW, cardH, 28);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  ctx.fillStyle = '#141416';
  ctx.font = `800 44px ${DISPLAY}`;
  ctx.textAlign = 'center';
  ctx.fillText('HORARIOS POR CATEGORÍA', FLYER_W / 2, cardY + 72);

  rows.forEach((row, i) => {
    const y = cardY + 120 + i * rowH;
    if (i > 0) {
      ctx.strokeStyle = '#E5E7EB';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cardX + 40, y - rowH / 2 + 8);
      ctx.lineTo(cardX + cardW - 40, y - rowH / 2 + 8);
      ctx.stroke();
    }
    ctx.textAlign = 'left';
    ctx.fillStyle = '#141416';
    fitText(ctx, row.category.toUpperCase(), cardW - 340, 42, DISPLAY, 700);
    ctx.fillText(row.category.toUpperCase(), cardX + 44, y);
    ctx.textAlign = 'right';
    ctx.fillStyle = row.time === 'A confirmar' ? '#6B7280' : '#B8202D';
    const tSize = row.time === 'A confirmar' ? 34 : 48;
    ctx.font = `800 ${tSize}px ${DISPLAY}`;
    ctx.fillText(row.time, cardX + cardW - 44, y + 4);
  });

  // Pie
  const footY = cardY + cardH + 90;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#D3AC45';
  ctx.font = `700 34px ${SANS}`;
  ctx.fillText('UN LUGAR PARA COMPARTIR EN FAMILIA', FLYER_W / 2, footY);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = `500 30px ${SANS}`;
  ctx.fillText('csdsoler.com.ar', FLYER_W / 2, footY + 52);

  return canvas;
}

export async function downloadFlyer(data: FlyerData): Promise<string> {
  const canvas = await renderFlyer(data);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
  if (!blob) throw new Error('No se pudo generar la imagen.');
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const name = flyerFileName(data);
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return name;
}
