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

/** Líneas diagonales sutiles (textura de estadio). */
export function pinstripes(ctx: CanvasRenderingContext2D, w: number, h: number, color = '#ffffff', alpha = 0.035, gap = 46) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = -h; x < w + h; x += gap) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x + h * 0.35, h);
  }
  ctx.stroke();
  ctx.restore();
}

function initials(name: string): string {
  const clean = name.replace(/^(club|deportivo|social|atlético|atletico)\s+/i, '').trim();
  return (clean.slice(0, 2) || '??').toUpperCase();
}

export interface CrestStyle {
  base: string;
  ring: string;
  glow: string;
  glowAlpha: number;
}

/**
 * Escudo grande con base, anillo y resplandor. La imagen se encaja
 * (contain) sin deformar; si falla se dibujan iniciales.
 */
export function drawCrest(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | null,
  cx: number,
  cy: number,
  radius: number,
  name: string,
  style: CrestStyle,
) {
  ctx.save();
  ctx.shadowColor = style.glow;
  ctx.shadowBlur = radius * 0.55;
  ctx.globalAlpha = style.glowAlpha;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = style.glow;
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = style.base;
  ctx.fill();
  ctx.clip();

  const usable = img && img.naturalWidth > 0 && img.naturalHeight > 0;
  let painted = false;
  if (usable) {
    try {
      const pad = radius * 0.26;
      const box = (radius - pad) * 2;
      const scale = Math.min(box / (img as HTMLImageElement).naturalWidth, box / (img as HTMLImageElement).naturalHeight);
      const w = (img as HTMLImageElement).naturalWidth * scale;
      const h = (img as HTMLImageElement).naturalHeight * scale;
      ctx.drawImage(img as HTMLImageElement, cx - w / 2, cy - h / 2, w, h);
      painted = true;
    } catch {
      painted = false;
    }
  }
  if (!painted) {
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `800 ${Math.round(radius * 0.66)}px ${DISPLAY}`;
    ctx.fillText(initials(name), cx, cy + radius * 0.05);
  }
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.lineWidth = Math.max(3, radius * 0.055);
  ctx.strokeStyle = style.ring;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.86, 0, Math.PI * 2);
  ctx.lineWidth = Math.max(1.5, radius * 0.02);
  ctx.strokeStyle = 'rgba(255,255,255,0.28)';
  ctx.stroke();
  ctx.restore();
}

/** Insignia VS en diamante con borde luminoso. */
export function drawVsBadge(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, bg: string, border: string) {
  const r = size / 2;
  ctx.save();
  ctx.shadowColor = border;
  ctx.shadowBlur = size * 0.4;
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx + r, cy);
  ctx.lineTo(cx, cy + r);
  ctx.lineTo(cx - r, cy);
  ctx.closePath();
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.lineWidth = Math.max(3, size * 0.06);
  ctx.strokeStyle = border;
  ctx.stroke();
  ctx.restore();
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `800 ${Math.round(size * 0.42)}px ${DISPLAY}`;
  ctx.fillText('VS', cx, cy + size * 0.03);
  ctx.restore();
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
export function compactGrid(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  regionH: number,
  rows: { category: string; time: string }[],
  style: CompactGridStyle,
  minCellH = 64,
  maxCellH = 100,
) {
  const cols = 2;
  const gap = 18;
  if (rows.length === 0) {
    ctx.fillStyle = style.timePending;
    ctx.font = `500 30px ${SANS}`;
    ctx.textAlign = 'center';
    ctx.fillText('Horarios a confirmar', x + w / 2, y + 50);
    return;
  }
  const gw = (w - gap) / cols;
  const fullRows = Math.ceil(rows.length / cols);
  let cellH = Math.min(maxCellH, regionH / fullRows);
  let items = rows;
  let hidden = 0;
  if (cellH < minCellH) {
    cellH = minCellH;
    const visibleRows = Math.max(1, Math.floor(regionH / cellH));
    const capacity = cols * visibleRows;
    if (rows.length > capacity) {
      items = rows.slice(0, capacity - cols);
      hidden = rows.length - items.length;
    }
  }
  const drawCell = (gx: number, gy: number, cw: number, category: string, time: string) => {
    roundRect(ctx, gx, gy, cw, cellH - 12, 14);
    ctx.fillStyle = style.card;
    ctx.fill();
    ctx.fillStyle = time ? style.accent : style.timePending;
    roundRect(ctx, gx, gy, 8, cellH - 12, 4);
    ctx.fill();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = style.category;
    let cs = Math.round(cellH * 0.3);
    ctx.font = `700 ${cs}px ${DISPLAY}`;
    const label = category.toUpperCase().slice(0, 20);
    while (cs > 14 && ctx.measureText(label).width > cw - 40) {
      cs -= 1;
      ctx.font = `700 ${cs}px ${DISPLAY}`;
    }
    ctx.fillText(label, gx + 24, gy + cellH * 0.36);
    ctx.fillStyle = time === 'A confirmar' ? style.timePending : style.time;
    ctx.font = `800 ${Math.round(cellH * (time === 'A confirmar' ? 0.3 : 0.44))}px ${DISPLAY}`;
    ctx.fillText(time, gx + 24, gy + cellH * 0.82);
  };
  items.forEach((row, i) => {
    const col = i % cols;
    const rIdx = Math.floor(i / cols);
    drawCell(x + col * (gw + gap), y + rIdx * cellH, gw, row.category, row.time);
  });
  if (hidden > 0) {
    const sy = y + Math.ceil(items.length / cols) * cellH;
    if (sy + cellH - 12 <= y + regionH + 4) {
      roundRect(ctx, x, sy, w, cellH - 12, 14);
      ctx.fillStyle = style.summaryBg;
      ctx.fill();
      ctx.fillStyle = style.summaryFg;
      ctx.font = `800 ${Math.round(cellH * 0.32)}px ${DISPLAY}`;
      ctx.textAlign = 'center';
      ctx.fillText(`+${hidden} CATEGORÍAS MÁS`, x + w / 2, sy + cellH * 0.62);
    }
  }
}

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
