/**
 * Utilidades Canvas compartidas por las plantillas de flyers.
 */

export const DISPLAY = '"Barlow Condensed", "Arial Narrow", sans-serif';
export const SANS = 'Inter, system-ui, -apple-system, sans-serif';

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** Texto itálico anclado: compensa el desplazamiento del sesgo en yAnchor. */
export function skewedAt(ctx: CanvasRenderingContext2D, cx: number, yAnchor: number, fn: () => void) {
  ctx.save();
  ctx.translate(cx + 0.14 * yAnchor, 0);
  ctx.transform(1, 0, -0.14, 1, 0, 0);
  ctx.translate(-cx, 0);
  fn();
  ctx.restore();
}

/** Texto que se encoge y, si no entra, se trunca con elipsis. */
export function fitLine(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxW: number,
  base: number,
  family: string,
  weight: number,
  color: string,
  align: CanvasTextAlign = 'center',
): void {
  let t = text;
  let size = base;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  const set = (s: number) => {
    ctx.font = `${weight} ${s}px ${family}`;
  };
  set(size);
  while (size > 20 && ctx.measureText(t).width > maxW) {
    size -= 2;
    set(size);
  }
  while (t.length > 4 && ctx.measureText(t).width > maxW) {
    t = t.slice(0, -2);
    set(size);
  }
  if (t !== text) {
    t = `${t.trimEnd()}…`;
    while (t.length > 2 && ctx.measureText(t).width > maxW) {
      t = `${t.slice(0, -2).trimEnd()}…`;
    }
  }
  ctx.fillStyle = color;
  ctx.fillText(t, x, y);
}
/** Transformación por bloque (escalas/posiciones del editor) sin reescribir coordenadas. */
export function withBlock(
  ctx: CanvasRenderingContext2D,
  cx: number,
  anchorY: number,
  scale: number | undefined,
  dx: number | undefined,
  dy: number | undefined,
  fn: () => void,
) {
  const s = scale ?? 1;
  const x = dx ?? 0;
  const d = dy ?? 0;
  if (s === 1 && x === 0 && d === 0) {
    fn();
    return;
  }
  ctx.save();
  ctx.translate(cx + x, anchorY + d);
  ctx.scale(s, s);
  ctx.translate(-cx, -anchorY);
  fn();
  ctx.restore();
}

export function fitCenter(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  y: number,
  maxWidth: number,
  base: number,
  family: string,
  weight: number,
  color: string,
): number {
  let size = base;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `${weight} ${size}px ${family}`;
  while (size > 18 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = `${weight} ${size}px ${family}`;
  }
  ctx.fillStyle = color;
  ctx.fillText(text, cx, y);
  return size;
}

export function spaced(ctx: CanvasRenderingContext2D, px: number) {
  try {
    (ctx as unknown as { letterSpacing: string }).letterSpacing = `${px}px`;
  } catch {
    /* navegadores sin soporte: sin tracking */
  }
}

export function unspaced(ctx: CanvasRenderingContext2D) {
  try {
    (ctx as unknown as { letterSpacing: string }).letterSpacing = '0px';
  } catch {
    /* nada */
  }
}

let grainTile: HTMLCanvasElement | null = null;

/** Grano de película sutil para texturas deportivas. */
export function grain(ctx: CanvasRenderingContext2D, w: number, h: number, alpha = 0.05) {
  if (!grainTile) {
    grainTile = document.createElement('canvas');
    grainTile.width = 160;
    grainTile.height = 160;
    const g = grainTile.getContext('2d');
    if (!g) return;
    const img = g.createImageData(160, 160);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.floor(Math.random() * 255);
      img.data[i] = v;
      img.data[i + 1] = v;
      img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  }
  ctx.save();
  ctx.globalAlpha = alpha;
  const pattern = ctx.createPattern(grainTile, 'repeat');
  if (pattern) {
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, w, h);
  }
  ctx.restore();
}

export function vignette(ctx: CanvasRenderingContext2D, w: number, h: number, strength = 0.55) {
  const g = ctx.createRadialGradient(w / 2, h * 0.42, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

/** Pin de ubicación simple (sin emojis, que no renderizan en Canvas). */
export function drawPin(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y - s * 0.25, s * 0.42, Math.PI * 0.15, Math.PI * 0.85, true);
  ctx.lineTo(x, y + s * 0.45);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.beginPath();
  ctx.arc(x, y - s * 0.25, s * 0.16, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export interface RowFit {
  visible: { category: string; time: string }[];
  hidden: number;
  rowH: number;
}

export interface CompactGridStyle {
  card: string;
  category: string;
  time: string;
  timePending: string;
  accent: string;
  summaryBg: string;
  summaryFg: string;
}

/**
 * Grilla compacta de 2 columnas para horarios (formatos cortos).
 * Siempre entra en la región: si sobran filas, la última es un resumen "+N".
 */

/** Calcula cuántas filas entran en una región; el resto se resume en "+N". */
export function fitRows(
  rows: { category: string; time: string }[],
  regionH: number,
  maxRowH: number,
  minRowH: number,
  reserveMoreRow: boolean,
): RowFit {
  let rowH = Math.min(maxRowH, regionH / Math.max(1, rows.length));
  if (rowH >= minRowH) return { visible: rows, hidden: 0, rowH };
  const perRow = minRowH;
  const capacity = Math.max(1, Math.floor((regionH - (reserveMoreRow ? perRow : 0)) / perRow));
  if (capacity >= rows.length) return { visible: rows, hidden: 0, rowH: Math.min(maxRowH, regionH / rows.length) };
  return { visible: rows.slice(0, Math.max(0, capacity)), hidden: rows.length - Math.max(0, capacity), rowH: perRow };
}
