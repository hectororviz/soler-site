/**
 * Football Energy: campaña deportiva intensa. Diagonales, degradados,
 * neones, semitonos y tipografía itálica de velocidad.
 */
import type { FlyerContent, FlyerShow, FormatId, Palette } from '../types';
import { FORMATS } from '../types';
import { DISPLAY, SANS, drawCrest, drawPin, fitCenter, fitLine, fitRows, grain, roundRect, skewedAt, vignette } from './common';

export const FOOTBALL_ENERGY_DEFAULTS: Palette = {
  primary: '#E02636',
  accent: '#FFC93C',
  bg: '#0E0F14',
  ink: '#FFFFFF',
};

export interface EnergyAssets {
  home: HTMLImageElement | null;
  away: HTMLImageElement | null;
  bg: HTMLImageElement | null;
}

function diagonals(ctx: CanvasRenderingContext2D, w: number, h: number, p: Palette) {
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate((-18 * Math.PI) / 180);
  const W = w * 1.6;
  const H = h * 1.6;
  // Banda principal degradada
  const band = ctx.createLinearGradient(0, -H * 0.32, 0, -H * 0.05);
  band.addColorStop(0, p.primary);
  band.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = band;
  ctx.fillRect(-W / 2, -H * 0.32, W, H * 0.27);
  // Banda secundaria dorada fina
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = p.accent;
  ctx.fillRect(-W / 2, -H * 0.065, W, 14);
  // Banda inferior oscura con filo neón
  ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(-W / 2, H * 0.18, W, H * 0.32);
  ctx.fillStyle = p.accent;
  ctx.globalAlpha = 0.85;
  ctx.fillRect(-W / 2, H * 0.18, W, 8);
  ctx.restore();
}

function halftone(ctx: CanvasRenderingContext2D, x: number, y: number, cols: number, rows: number, gap: number, color: string) {
  ctx.save();
  ctx.fillStyle = color;
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const r = 2 + ((i + j) % 4);
      ctx.globalAlpha = 0.16;
      ctx.beginPath();
      ctx.arc(x + i * gap, y + j * gap, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function speedLines(ctx: CanvasRenderingContext2D, w: number, y: number, color: string) {
  ctx.save();
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = color;
  const lines: Array<[number, number, number]> = [
    [60, y, 260],
    [140, y + 26, 420],
    [40, y + 52, 200],
    [w - 480, y + 14, 420],
    [w - 300, y + 40, 260],
  ];
  for (const [x, yy, len] of lines) {
    ctx.save();
    ctx.translate(x, yy);
    ctx.rotate((-8 * Math.PI) / 180);
    ctx.fillRect(0, 0, len, 6);
    ctx.restore();
  }
  ctx.restore();
}

function burst(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string) {
  ctx.save();
  ctx.beginPath();
  const spikes = 12;
  for (let i = 0; i < spikes * 2; i++) {
    const rr = i % 2 === 0 ? r : r * 0.78;
    const a = (Math.PI * i) / spikes - Math.PI / 2;
    const x = cx + Math.cos(a) * rr;
    const y = cy + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.shadowColor = color;
  ctx.shadowBlur = r * 0.5;
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#101016';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `800 ${Math.round(r * 0.62)}px ${DISPLAY}`;
  ctx.fillText('VS', cx, cy + r * 0.04);
}

function schedCard(
  ctx: CanvasRenderingContext2D,
  gx: number,
  ry: number,
  cw: number,
  rh: number,
  skew: number,
  row: { category: string; time: string },
  p: Palette,
  centerY: number,
) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(gx + skew, ry);
  ctx.lineTo(gx + cw, ry);
  ctx.lineTo(gx + cw - skew, ry + rh - 12);
  ctx.lineTo(gx, ry + rh - 12);
  ctx.closePath();
  ctx.fillStyle = 'rgba(255,255,255,0.09)';
  ctx.fill();
  ctx.restore();
  const edge = ctx.createLinearGradient(0, ry, 0, ry + rh);
  edge.addColorStop(0, p.accent);
  edge.addColorStop(1, p.primary);
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(gx + skew, ry);
  ctx.lineTo(gx + skew + 10, ry);
  ctx.lineTo(gx + skew, ry + rh - 12);
  ctx.lineTo(gx, ry + rh - 12);
  ctx.closePath();
  ctx.fillStyle = row.time ? edge : 'rgba(255,255,255,0.25)';
  ctx.fill();
  ctx.restore();
  skewedAt(ctx, gx + cw / 2, centerY, () => {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#fff';
    let cs = Math.round(rh * 0.32);
    ctx.font = `800 ${cs}px ${DISPLAY}`;
    const maxCat = cw - (row.time ? 300 : 60) - skew * 2;
    while (cs > 15 && ctx.measureText(row.category.toUpperCase()).width > maxCat) {
      cs -= 2;
      ctx.font = `800 ${cs}px ${DISPLAY}`;
    }
    ctx.fillText(row.category.toUpperCase(), gx + skew + 28, ry + rh / 2 + cs * 0.3);
    if (row.time) {
      ctx.textAlign = 'right';
      const pending = row.time === 'A confirmar';
      ctx.fillStyle = pending ? 'rgba(255,255,255,0.55)' : p.accent;
      ctx.font = `800 ${pending ? Math.round(rh * 0.28) : Math.round(rh * 0.42)}px ${DISPLAY}`;
      ctx.fillText(row.time, gx + cw - skew - 24, ry + rh / 2 + rh * 0.14);
    }
  });
}

function schedSkew(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  regionH: number,
  rows: { category: string; time: string }[],
  p: Palette,
) {
  if (rows.length === 0) {
    skewedAt(ctx, x + w / 2, y + 60, () => {
      ctx.fillStyle = 'rgba(255,255,255,0.65)';
      ctx.font = `500 32px ${SANS}`;
      ctx.textAlign = 'center';
      ctx.fillText('HORARIOS A CONFIRMAR', x + w / 2, y + 60);
    });
    return;
  }
  const skew = 18;
  if (rows.length <= 4) {
    const fit = fitRows(rows, regionH, 100, 62, true);
    const list = fit.hidden > 0 ? [...fit.visible, { category: `+${fit.hidden} MÁS`, time: '' }] : fit.visible;
    list.forEach((row, i) => {
      const ry = y + i * fit.rowH;
      const isMore = row.time === '' && row.category.startsWith('+');
      if (isMore) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(x + skew, ry);
        ctx.lineTo(x + w, ry);
        ctx.lineTo(x + w - skew, ry + fit.rowH - 12);
        ctx.lineTo(x, ry + fit.rowH - 12);
        ctx.closePath();
        ctx.fillStyle = 'rgba(8,9,13,0.94)';
        ctx.fill();
        ctx.restore();
      }
      schedCard(ctx, x, ry, w, fit.rowH, skew, row, p, ry + fit.rowH / 2);
    });
    return;
  }
  // Dos columnas para muchas categorías.
  const cols = 2;
  const gap = 20;
  const cw = (w - gap) / cols;
  const perCol = Math.ceil(rows.length / cols);
  let rh = Math.min(100, regionH / perCol);
  let items = rows;
  let hidden = 0;
  if (rh < 62) {
    rh = 62;
    const visRows = Math.max(1, Math.floor(regionH / rh));
    const capacity = cols * visRows;
    if (rows.length > capacity) {
      items = rows.slice(0, capacity - cols);
      hidden = rows.length - items.length;
    }
  }
  items.forEach((row, i) => {
    const col = i % cols;
    const rIdx = Math.floor(i / cols);
    const gy = y + rIdx * rh;
    schedCard(ctx, x + col * (cw + gap), gy, cw, rh, skew, row, p, gy + rh / 2);
  });
  if (hidden > 0) {
    const sy = y + Math.ceil(items.length / cols) * rh;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x + skew, sy);
    ctx.lineTo(x + w, sy);
    ctx.lineTo(x + w - skew, sy + rh - 12);
    ctx.lineTo(x, sy + rh - 12);
    ctx.closePath();
    ctx.fillStyle = 'rgba(8,9,13,0.94)';
    ctx.fill();
    ctx.restore();
    skewedAt(ctx, x + w / 2, sy + rh / 2, () => {
      ctx.fillStyle = p.accent;
      ctx.font = `800 ${Math.round(rh * 0.34)}px ${DISPLAY}`;
      ctx.textAlign = 'center';
      ctx.fillText(`+${hidden} MÁS`, x + w / 2, sy + rh * 0.62);
    });
  }
}

export function renderFootballEnergy(
  ctx: CanvasRenderingContext2D,
  content: FlyerContent,
  palette: Palette,
  format: FormatId,
  show: FlyerShow,
  assets: EnergyAssets,
) {
  const { w, h } = FORMATS[format];
  const p = { ...FOOTBALL_ENERGY_DEFAULTS, ...palette };
  const cx = w / 2;

  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, w, h);
  if (assets.bg) {
    try {
      ctx.save();
      ctx.globalAlpha = 0.35;
      const img = assets.bg;
      const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
      const dw = img.naturalWidth * scale;
      const dh = img.naturalHeight * scale;
      ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
      ctx.restore();
      const shade = ctx.createLinearGradient(0, 0, 0, h);
      shade.addColorStop(0, 'rgba(8,9,13,0.70)');
      shade.addColorStop(1, 'rgba(8,9,13,0.92)');
      ctx.fillStyle = shade;
      ctx.fillRect(0, 0, w, h);
    } catch {
      /* fondo procedural */
    }
  }
  diagonals(ctx, w, h, p);
  halftone(ctx, w - 260, 120, 6, 8, 34, p.accent);
  halftone(ctx, 60, h * 0.42, 5, 7, 34, '#ffffff');
  speedLines(ctx, w, h * 0.30, p.accent);
  grain(ctx, w, h, 0.05);
  vignette(ctx, w, h, 0.62);

  const gradRing = (r: number) => {
    const g = ctx.createLinearGradient(0, -r, 0, r);
    g.addColorStop(0, p.accent);
    g.addColorStop(1, p.primary);
    return g;
  };

  if (format === 'square') {
    skewedAt(ctx, cx, 110, () => {
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = `700 26px ${SANS}`;
      ctx.fillText('CLUB SOCIAL Y DEPORTIVO SOLER', cx, 66);
      fitCenter(ctx, content.tournamentName.toUpperCase(), cx, 150, w - 120, 80, DISPLAY, 800, '#ffffff');
    });
    if (show.round) {
      ctx.save();
      ctx.translate(cx + 36, 210);
      ctx.transform(1, 0, -0.14, 1, 0, 0);
      ctx.fillStyle = p.primary;
      const t = content.roundLabel.toUpperCase();
      ctx.font = `800 38px ${DISPLAY}`;
      const pw = Math.min(w - 220, ctx.measureText(t).width + 90);
      ctx.fillRect(-pw / 2, 0, pw, 62);
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.fillText(t, 0, 44);
      ctx.restore();
    }
    if (show.day) {
      skewedAt(ctx, cx, 348, () => {
        fitCenter(ctx, content.dayTitle, cx, 330, w - 120, 46, DISPLAY, 800, p.accent);
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.font = `500 28px ${SANS}`;
        ctx.textAlign = 'center';
        ctx.fillText(content.daySubtitle, cx, 366);
      });
    }
    const cy = 520;
    const r = 92;
    drawCrest(ctx, assets.home, 295, cy, r, content.homeName, { base: '#ffffff', ring: gradRing(r) as unknown as string, glow: p.primary, glowAlpha: 0.6 });
    drawCrest(ctx, assets.away, 785, cy, r, content.awayName, { base: '#ffffff', ring: '#ffffff', glow: p.primary, glowAlpha: 0.5 });
    burst(ctx, cx, cy, 56, p.accent);
    skewedAt(ctx, cx, 660, () => {
      fitLine(ctx, content.homeName.toUpperCase(), cx - 105, 660, 330, 42, DISPLAY, 800, '#ffffff', 'right');
      fitLine(ctx, content.awayName.toUpperCase(), cx + 105, 660, 330, 42, DISPLAY, 800, '#ffffff', 'left');
    });
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = `700 24px ${SANS}`;
    ctx.textAlign = 'center';
    ctx.fillText('LOCAL', 295, 688);
    ctx.fillText('VISITANTE', 785, 688);
    skewedAt(ctx, cx, 740, () => {
      ctx.fillStyle = p.accent;
      ctx.font = `800 36px ${DISPLAY}`;
      ctx.textAlign = 'left';
      ctx.fillText('HORARIOS', 90, 740);
    });
    schedSkew(ctx, 90, 758, w - 180, 208, content.rows, p);
    if (show.venue && content.venue) {
      drawPin(ctx, cx - 220, 1018, 26, p.accent);
      ctx.fillStyle = '#fff';
      ctx.font = `600 27px ${SANS}`;
      ctx.textAlign = 'center';
      ctx.fillText(content.venue.toUpperCase().slice(0, 46), cx + 10, 1026);
    }
    if (show.footer) {
      ctx.fillStyle = p.accent;
      ctx.font = `800 25px ${SANS}`;
      ctx.textAlign = 'center';
      ctx.fillText('UN LUGAR PARA COMPARTIR EN FAMILIA • CSDSOLER.COM.AR', cx, 1060);
    }
    return;
  }

  const isFeed = format === 'feed';
  skewedAt(ctx, cx, 150, () => {
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = `700 ${isFeed ? 25 : 29}px ${SANS}`;
    ctx.fillText('CLUB SOCIAL Y DEPORTIVO SOLER', cx, isFeed ? 74 : 92);
    fitCenter(ctx, content.tournamentName.toUpperCase(), cx, isFeed ? 175 : 215, w - 130, isFeed ? 96 : 118, DISPLAY, 800, '#ffffff');
  });
  if (show.round) {
    ctx.save();
    ctx.translate(cx + (isFeed ? 35 : 43), isFeed ? 200 : 248);
    ctx.transform(1, 0, -0.14, 1, 0, 0);
    ctx.fillStyle = p.primary;
    const t = content.roundLabel.toUpperCase();
    ctx.font = `800 ${isFeed ? 42 : 50}px ${DISPLAY}`;
    const pw = Math.min(w - 200, ctx.measureText(t).width + 100);
    ctx.fillRect(-pw / 2, 0, pw, isFeed ? 70 : 80);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText(t, 0, isFeed ? 50 : 58);
    ctx.restore();
  }
  if (show.day) {
    skewedAt(ctx, cx, isFeed ? 350 : 440, () => {
      fitCenter(ctx, content.dayTitle, cx, isFeed ? 330 : 415, w - 130, isFeed ? 52 : 60, DISPLAY, 800, p.accent);
      ctx.fillStyle = 'rgba(255,255,255,0.88)';
      ctx.font = `500 ${isFeed ? 31 : 35}px ${SANS}`;
      ctx.textAlign = 'center';
      ctx.fillText(content.daySubtitle, cx, isFeed ? 372 : 463);
    });
  }
  if (show.venue && content.venue) {
    const vy = isFeed ? 420 : 525;
    const label = content.venue.toUpperCase();
    ctx.font = `700 ${isFeed ? 30 : 33}px ${SANS}`;
    const tw = Math.min(w - 260, ctx.measureText(label).width);
    ctx.save();
    ctx.translate(cx + 0.14 * (vy + 2), vy);
    ctx.transform(1, 0, -0.14, 1, 0, 0);
    roundRect(ctx, -tw / 2 - 60, -44, tw + 120, 62, 8);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fill();
    ctx.restore();
    drawPin(ctx, cx - tw / 2 - 34, vy - 12, 28, p.accent);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText(label.slice(0, 44), cx + 8, vy + 2);
  }

  const cy = isFeed ? 620 : 910;
  const r = isFeed ? 136 : 164;
  const lx = isFeed ? 272 : 300;
  drawCrest(ctx, assets.home, lx, cy, r, content.homeName, { base: '#ffffff', ring: gradRing(r) as unknown as string, glow: p.primary, glowAlpha: 0.65 });
  drawCrest(ctx, assets.away, w - lx, cy, r, content.awayName, { base: '#ffffff', ring: '#ffffff', glow: p.primary, glowAlpha: 0.5 });
  burst(ctx, cx, cy, isFeed ? 62 : 72, p.accent);

  const nameY = isFeed ? 800 : 1138;
  skewedAt(ctx, cx, nameY, () => {
    fitLine(ctx, content.homeName.toUpperCase(), cx - 105, nameY, 340, isFeed ? 50 : 58, DISPLAY, 800, '#ffffff', 'right');
    fitLine(ctx, content.awayName.toUpperCase(), cx + 105, nameY, 340, isFeed ? 50 : 58, DISPLAY, 800, '#ffffff', 'left');
  });
  ctx.fillStyle = p.accent;
  ctx.font = `800 ${isFeed ? 26 : 29}px ${SANS}`;
  ctx.textAlign = 'center';
  ctx.fillText('LOCAL', lx, isFeed ? 834 : 1178);
  ctx.fillText('VISITANTE', w - lx, isFeed ? 834 : 1178);

  skewedAt(ctx, cx, isFeed ? 902 : 1272, () => {
    ctx.fillStyle = p.accent;
    ctx.font = `800 ${isFeed ? 40 : 44}px ${DISPLAY}`;
    ctx.textAlign = 'left';
    ctx.fillText('HORARIOS', 90, isFeed ? 902 : 1272);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = `700 26px ${SANS}`;
    ctx.fillText(`${content.rows.length} CAT.`, 90 + ctx.measureText('HORARIOS').width + 260, isFeed ? 898 : 1268);
  });
  const gy = isFeed ? 924 : 1300;
  const gEnd = isFeed ? 1190 : 1720;
  schedSkew(ctx, 90, gy, w - 180, gEnd - gy, content.rows, p);

  if (show.footer) {
    const fy = isFeed ? 1268 : 1810;
    skewedAt(ctx, cx, fy, () => {
      ctx.fillStyle = p.accent;
      ctx.font = `800 ${isFeed ? 30 : 33}px ${SANS}`;
      ctx.textAlign = 'center';
      ctx.fillText('UN LUGAR PARA COMPARTIR EN FAMILIA', cx, fy);
    });
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.font = `500 ${isFeed ? 27 : 29}px ${SANS}`;
    ctx.textAlign = 'center';
    ctx.fillText('csdsoler.com.ar', cx, fy + (isFeed ? 40 : 50));
  }
}
