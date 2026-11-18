/**
 * Bloque de horarios configurable: lista / columnas / tarjetas / tabla.
 * `auto` reacomoda (lista → columnas → denso) para mostrar todas las
 * categorías antes de resumir con "+N". Ninguna variante es una tabla
 * administrativa: todas usan jerarquía deportiva (categoría + hora heroica).
 */
import { DISPLAY, SANS, roundRect, skewedAt } from '../templates/common';
import { fitRows } from '../templates/common';
import type { ScheduleVariant } from '../types';

export interface ScheduleStyle {
  rowBg: string;
  rowBgAlt: string;
  catColor: string;
  timeColor: string;
  timePending: string;
  accent: string;
  summaryBg: string;
  summaryFg: string;
  leaderDots: boolean;
  radius: number;
}

function quad(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  skew: number,
) {
  if (!skew) {
    roundRect(ctx, x, y, w, h, r);
    return;
  }
  const rr = Math.min(r, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + skew + rr, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w - skew, y + h);
  ctx.lineTo(x, y + h);
  ctx.closePath();
}

function textRow(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxW: number,
  base: number,
  family: string,
  weight: number,
  color: string,
  align: CanvasTextAlign,
  anchorX: number,
  anchorY: number,
  skew: boolean,
) {
  const draw = () => {
    let size = base;
    ctx.font = `${weight} ${size}px ${family}`;
    while (size > 12 && ctx.measureText(text).width > maxW) {
      size -= 2;
      ctx.font = `${weight} ${size}px ${family}`;
    }
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(text, x, y);
  };
  if (skew) skewedAt(ctx, anchorX, anchorY, draw);
  else draw();
}

function summaryBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  hidden: number,
  style: ScheduleStyle,
  skew: boolean,
) {
  quad(ctx, x, y, w, Math.max(20, h), style.radius, skew ? 10 : 0);
  ctx.fillStyle = style.summaryBg;
  ctx.fill();
  textRow(ctx, `+${hidden} MÁS`, x + w / 2, y + h * 0.64, w - 40, Math.round(h * 0.34), DISPLAY, 800, style.summaryFg, 'center', x + w / 2, y + h / 2, skew);
}

function emptyMsg(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, style: ScheduleStyle, skew: boolean) {
  textRow(ctx, 'Horarios a confirmar', x + w / 2, y + 56, w - 40, 30, SANS, 500, style.timePending, 'center', x + w / 2, y + 40, skew);
}

function dotLeaders(
  ctx: CanvasRenderingContext2D,
  x0: number,
  x1: number,
  y: number,
  color: string,
) {
  if (x1 <= x0 + 10) return;
  ctx.save();
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.32;
  ctx.font = `700 22px ${SANS}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  let dots = '';
  const n = Math.min(60, Math.floor((x1 - x0) / 15));
  for (let k = 0; k < n; k++) dots += '· ';
  ctx.fillText(dots, x0, y);
  ctx.restore();
}

function listLayout(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  regionH: number,
  rows: { category: string; time: string }[],
  style: ScheduleStyle,
  skew: boolean,
  minRow: number,
  tune: ScheduleTuning = {},
): { hidden: number } {
  if (!rows.length) {
    emptyMsg(ctx, x, y, w, style, skew);
    return { hidden: 0 };
  }
  const rs = tune.rowScale ?? 1;
  const catK = tune.catScale ?? 1;
  const timeK = tune.timeScale ?? 1;
  const fit = fitRows(rows, regionH, 100, minRow * rs, true);
  const list = fit.hidden > 0 ? [...fit.visible, { category: `+${fit.hidden} MÁS`, time: '' }] : fit.visible;
  const rh = fit.rowH;
  const sk = skew ? 14 : 0;
  list.forEach((row, i) => {
    const ry = y + i * rh;
    const isMore = row.time === '' && row.category.startsWith('+');
    quad(ctx, x, ry, w, rh - 10, style.radius, sk);
    ctx.fillStyle = isMore ? style.summaryBg : i % 2 === 0 ? style.rowBg : style.rowBgAlt;
    ctx.fill();
    if (!isMore) {
      ctx.fillStyle = row.time ? style.accent : style.timePending;
      if (skew) {
        ctx.fillRect(x + sk, ry, 8, rh - 10);
      } else {
        roundRect(ctx, x, ry, 8, rh - 10, 4);
        ctx.fill();
      }
    }
    const cy = ry + rh / 2;
    if (isMore) {
      textRow(ctx, row.category, x + w / 2, ry + rh * 0.62, w - 40, Math.round(rh * 0.3), DISPLAY, 800, style.summaryFg, 'center', x + w / 2, cy, skew);
      return;
    }
    let cs = Math.round(rh * 0.32 * catK);
    const maxCat = w - (row.time ? 300 : 60) - sk * 2;
    ctx.font = `700 ${cs}px ${DISPLAY}`;
    while (cs > 12 && ctx.measureText(row.category.toUpperCase()).width > maxCat) {
      cs -= 2;
      ctx.font = `700 ${cs}px ${DISPLAY}`;
    }
    textRow(ctx, row.category.toUpperCase(), x + 30 + sk, cy + cs * 0.32, maxCat, cs, DISPLAY, 700, style.catColor, 'left', x + w / 2, cy, skew);
    if (style.leaderDots && row.time) {
      const catW = Math.min(maxCat, ctx.measureText(row.category.toUpperCase()).width);
      const drawDots = () => dotLeaders(ctx, x + 30 + sk + catW + 16, x + w - 300 - sk, cy + 8, style.catColor);
      if (skew) skewedAt(ctx, x + w / 2, cy, drawDots);
      else drawDots();
    }
    if (row.time) {
      const pending = row.time === 'A confirmar';
      textRow(
        ctx, row.time, x + w - 26 - sk, cy + rh * 0.15, 260,
        pending ? Math.round(rh * 0.28 * timeK) : Math.round(rh * 0.42 * timeK), DISPLAY, 800,
        pending ? style.timePending : style.timeColor, 'right', x + w / 2, cy, skew,
      );
    }
  });
  return { hidden: fit.hidden };
}

function gridLayout(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  regionH: number,
  rows: { category: string; time: string }[],
  style: ScheduleStyle,
  skew: boolean,
  minCell: number,
  maxCell: number,
  cols: number,
  centered: boolean,
  tune: ScheduleTuning = {},
): { hidden: number } {
  const rsT = tune.rowScale ?? 1;
  const catT = tune.catScale ?? 1;
  const timeT = tune.timeScale ?? 1;
  minCell = minCell * rsT;
  maxCell = maxCell * rsT;
  if (!rows.length) {
    emptyMsg(ctx, x, y, w, style, skew);
    return { hidden: 0 };
  }
  const gap = 16;
  const cw = (w - gap * (cols - 1)) / cols;
  const sk = skew ? 12 : 0;
  const perCol = Math.ceil(rows.length / cols);
  let ch = Math.min(maxCell, regionH / perCol);
  let items = rows;
  let hidden = 0;
  if (ch < minCell) {
    ch = minCell;
    const visRows = Math.max(1, Math.floor(regionH / ch));
    const capacity = cols * visRows;
    if (rows.length > capacity) {
      items = rows.slice(0, capacity - cols);
      hidden = rows.length - items.length;
    }
  }
  items.forEach((row, i) => {
    const col = i % cols;
    const rIdx = Math.floor(i / cols);
    const gx = x + col * (cw + gap);
    const gy = y + rIdx * ch;
    quad(ctx, gx, gy, cw, ch - 10, style.radius, sk);
    ctx.fillStyle = style.rowBg;
    ctx.fill();
    ctx.fillStyle = row.time ? style.accent : style.timePending;
    if (skew) ctx.fillRect(gx + sk, gy, 7, ch - 10);
    else {
      roundRect(ctx, gx, gy, 7, ch - 10, 3.5);
      ctx.fill();
    }
    const cy = gy + ch / 2;
    if (centered) {
      textRow(ctx, row.category.toUpperCase().slice(0, 18), gx + cw / 2, gy + ch * 0.34, cw - 30, Math.round(ch * 0.26 * catT), DISPLAY, 700, style.catColor, 'center', gx + cw / 2, cy, skew);
      const pending = row.time === 'A confirmar';
      textRow(
        ctx, row.time, gx + cw / 2, gy + ch * 0.78, cw - 24,
        pending ? Math.round(ch * 0.24 * timeT) : Math.round(ch * 0.4 * timeT), DISPLAY, 800,
        pending ? style.timePending : style.timeColor, 'center', gx + cw / 2, cy, skew,
      );
    } else {
      textRow(ctx, row.category.toUpperCase().slice(0, 16), gx + 26 + sk, gy + ch * 0.36, cw - 60, Math.round(ch * 0.28 * catT), DISPLAY, 700, style.catColor, 'left', gx + cw / 2, cy, skew);
      const pending = row.time === 'A confirmar';
      textRow(
        ctx, row.time, gx + 26 + sk, gy + ch * 0.8, cw - 50,
        pending ? Math.round(ch * 0.26 * catT) : Math.round(ch * 0.42 * timeT), DISPLAY, 800,
        pending ? style.timePending : style.timeColor, 'left', gx + cw / 2, cy, skew,
      );
    }
  });
  if (hidden > 0) {
    const sy = y + Math.ceil(items.length / cols) * ch;
    if (sy + ch - 10 <= y + regionH + 4) {
      summaryBar(ctx, x, sy, w, ch - 10, hidden, style, skew);
    }
  }
  return { hidden };
}

/**
 * Lista compacta: categoría y hora en la misma línea, sin cajas.
 * Solo filetes divisores. Ideal story 9:16 con muchas categorías.
 */
function compactLayout(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  regionH: number,
  rows: { category: string; time: string }[],
  style: ScheduleStyle,
  skew: boolean,
  cols: number,
  tune: ScheduleTuning = {},
): { hidden: number } {
  if (!rows.length) {
    emptyMsg(ctx, x, y, w, style, skew);
    return { hidden: 0 };
  }
  const rsT = tune.rowScale ?? 1;
  const catT = tune.catScale ?? 1;
  const timeT = tune.timeScale ?? 1;
  const gap = 28;
  const cw = (w - gap * (cols - 1)) / cols;
  const sk = skew ? 8 : 0;
  const perCol = Math.ceil(rows.length / cols);
  const minR = 40 * rsT;
  let rh = Math.min(60 * rsT, regionH / Math.max(1, perCol));
  let items = rows;
  let hidden = 0;
  if (rh < minR) {
    rh = minR;
    const visRows = Math.max(1, Math.floor(regionH / rh));
    const capacity = cols * visRows;
    if (rows.length > capacity) {
      items = rows.slice(0, Math.max(0, capacity - cols));
      hidden = rows.length - items.length;
    }
  }
  items.forEach((row, i) => {
    const col = i % cols;
    const rIdx = Math.floor(i / cols);
    const gx = x + col * (cw + gap);
    const gy = y + rIdx * rh;
    const cy = gy + rh / 2;
    // Filete divisor sutil (no caja).
    if (rIdx > 0 || col > 0) {
      ctx.save();
      ctx.fillStyle = style.catColor;
      ctx.globalAlpha = 0.16;
      ctx.fillRect(gx + 8, gy - 1, cw - 16, 2);
      ctx.restore();
    }
    const draw = () => {
      let cs = Math.round(rh * 0.3 * catT);
      ctx.font = `700 ${cs}px ${DISPLAY}`;
      const maxCat = cw - 150 - sk * 2;
      while (cs > 12 && ctx.measureText(row.category.toUpperCase()).width > maxCat) {
        cs -= 2;
        ctx.font = `700 ${cs}px ${DISPLAY}`;
      }
      ctx.fillStyle = style.catColor;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(row.category.toUpperCase(), gx + 10 + sk, cy + cs * 0.32);
      const pending = row.time === 'A confirmar';
      ctx.fillStyle = pending ? style.timePending : style.timeColor;
      ctx.font = `800 ${pending ? Math.round(rh * 0.3 * timeT) : Math.round(rh * 0.42 * timeT)}px ${DISPLAY}`;
      ctx.textAlign = 'right';
      ctx.fillText(row.time, gx + cw - 10 - sk, cy + rh * 0.16);
    };
    if (skew) skewedAt(ctx, gx + cw / 2, cy, draw);
    else draw();
  });
  if (hidden > 0) {
    const sy = y + Math.ceil(items.length / cols) * rh;
    if (sy + rh * 0.7 <= y + regionH + 4) {
      ctx.save();
      ctx.fillStyle = style.summaryFg;
      ctx.globalAlpha = 0.75;
      ctx.font = `800 ${Math.round(rh * 0.3)}px ${DISPLAY}`;
      ctx.textAlign = 'center';
      ctx.fillText(`+${hidden} MÁS`, x + w / 2, sy + rh * 0.55);
      ctx.restore();
    }
  }
  return { hidden };
}

function tableLayout(  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  regionH: number,
  rows: { category: string; time: string }[],
  style: ScheduleStyle,
  skew: boolean,
  tune: ScheduleTuning = {},
): { hidden: number } {
  if (!rows.length) {
    emptyMsg(ctx, x, y, w, style, skew);
    return { hidden: 0 };
  }
  const rsT = tune.rowScale ?? 1;
  const catT = tune.catScale ?? 1;
  const timeT = tune.timeScale ?? 1;
  const headH = 40;
  const drawHead = () => {
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = style.catColor;
    ctx.globalAlpha = 0.6;
    ctx.font = `800 24px ${DISPLAY}`;
    ctx.fillText('CAT', x + 16, y + 28);
    ctx.textAlign = 'right';
    ctx.fillText('HORA', x + w - 16, y + 28);
    ctx.globalAlpha = 1;
  };
  if (skew) skewedAt(ctx, x + w / 2, y + 20, drawHead);
  else drawHead();
  const bodyY = y + headH;
  const fit = fitRows(rows, regionH - headH, 64 * rsT, 40 * rsT, true);
  const list = fit.hidden > 0 ? [...fit.visible, { category: `+${fit.hidden} MÁS`, time: '' }] : fit.visible;
  const rh = fit.rowH;
  const sk = skew ? 10 : 0;
  list.forEach((row, i) => {
    const ry = bodyY + i * rh;
    if (i % 2 === 1) {
      quad(ctx, x, ry, w, rh - 4, 8, sk);
      ctx.fillStyle = style.rowBgAlt;
      ctx.fill();
    }
    if (i > 0) {
      ctx.fillStyle = style.catColor;
      ctx.globalAlpha = 0.18;
      ctx.fillRect(x + 12, ry, w - 24, 2);
      ctx.globalAlpha = 1;
    }
    const isMore = row.time === '' && row.category.startsWith('+');
    if (isMore) {
      quad(ctx, x, ry, w, rh - 4, 8, sk);
      ctx.fillStyle = style.summaryBg;
      ctx.fill();
      textRow(ctx, row.category, x + w / 2, ry + rh * 0.66, w - 40, Math.round(rh * 0.32), DISPLAY, 800, style.summaryFg, 'center', x + w / 2, ry + rh / 2, skew);
      return;
    }
    textRow(ctx, row.category.toUpperCase(), x + 16 + sk, ry + rh * 0.62, w - 220, Math.round(rh * 0.34 * catT), DISPLAY, 700, style.catColor, 'left', x + w / 2, ry + rh / 2, skew);
    const pending = row.time === 'A confirmar';
    textRow(
      ctx, row.time, x + w - 16 - sk, ry + rh * 0.62, 200,
      pending ? Math.round(rh * 0.3 * timeT) : Math.round(rh * 0.4 * timeT), DISPLAY, 800,
      pending ? style.timePending : style.timeColor, 'right', x + w / 2, ry + rh / 2, skew,
    );
  });
  return { hidden: fit.hidden };
}

export interface ScheduleTuning {
  /** 0 = auto, 1/2 = forzar columnas en auto/columnas */
  cols?: number;
  rowScale?: number;
  catScale?: number;
  timeScale?: number;
}

export function paintSchedule(
  ctx: CanvasRenderingContext2D,
  variant: ScheduleVariant,
  x: number,
  y: number,
  w: number,
  regionH: number,
  rows: { category: string; time: string }[],
  style: ScheduleStyle,
  skew: boolean,
  minRow = 54,
  tune: ScheduleTuning = {},
): { hidden: number } {
  const colsFor = (n: number) => (n > 6 ? 3 : 2);
  const force = tune.cols === 1 || tune.cols === 2 ? tune.cols : 0;
  switch (variant) {
    case 'list':
      if (force === 2) return gridLayout(ctx, x, y, w, regionH, rows, style, skew, 64, 100, 2, false, tune);
      return listLayout(ctx, x, y, w, regionH, rows, style, skew, minRow, tune);
    case 'columns':
      return gridLayout(ctx, x, y, w, regionH, rows, style, skew, 64, 100, force === 1 ? 1 : 2, false, tune);
    case 'cards':
      return gridLayout(ctx, x, y, w, regionH, rows, style, skew, 76, 118, force === 1 ? 1 : colsFor(rows.length), true, tune);
    case 'table':
      return tableLayout(ctx, x, y, w, regionH, rows, style, skew, tune);
    case 'compact':
      return compactLayout(ctx, x, y, w, regionH, rows, style, skew, tune.cols === 2 ? 2 : 1, tune);
    case 'compact2':
      return compactLayout(ctx, x, y, w, regionH, rows, style, skew, tune.cols === 1 ? 1 : 2, tune);
    case 'auto': {
      // Cascada compacta: 1 col densa → 2 col densas → tarjetas + resumen.
      const rs = tune.rowScale ?? 1;
      if (force === 1) {
        return compactLayout(ctx, x, y, w, regionH, rows, style, skew, 1, tune);
      }
      if (force === 2) {
        return compactLayout(ctx, x, y, w, regionH, rows, style, skew, 2, tune);
      }
      if (rows.length === 0 || rows.length * 40 * rs <= regionH) {
        return compactLayout(ctx, x, y, w, regionH, rows, style, skew, 1, tune);
      }
      {
        const cols = 2;
        const perCol = Math.ceil(rows.length / cols);
        if (perCol * 40 * rs <= regionH) {
          return compactLayout(ctx, x, y, w, regionH, rows, style, skew, cols, tune);
        }
        return gridLayout(ctx, x, y, w, regionH, rows, style, skew, 56, 88, cols, false, tune);
      }
    }
  }
}
