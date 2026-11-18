/**
 * Minimal Premium: editorial claro, alto contraste, tipografía protagonista.
 * Papel marfil, tinta negra, un bloque de color institucional y mucho aire.
 */
import type { FlyerContent, FlyerShow, FormatId, Palette } from '../types';
import { FORMATS } from '../types';
import { compactGrid, DISPLAY, SANS, drawCrest, drawPin, fitCenter, fitRows, grain, roundRect } from './common';

export const MINIMAL_PREMIUM_DEFAULTS: Palette = {
  primary: '#B8202D',
  accent: '#B8202D',
  bg: '#F5F2EB',
  ink: '#141414',
};

export interface MinimalAssets {
  home: HTMLImageElement | null;
  away: HTMLImageElement | null;
  bg: HTMLImageElement | null;
}

function paperBg(ctx: CanvasRenderingContext2D, w: number, h: number, p: Palette, assets: MinimalAssets) {
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, w, h);
  if (assets.bg) {
    try {
      ctx.save();
      ctx.globalAlpha = 0.14;
      const img = assets.bg;
      const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
      const dw = img.naturalWidth * scale;
      const dh = img.naturalHeight * scale;
      ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
      ctx.restore();
      const wash = ctx.createLinearGradient(0, 0, 0, h);
      wash.addColorStop(0, p.bg);
      wash.addColorStop(0.35, `${p.bg}CC`);
      wash.addColorStop(1, `${p.bg}F2`);
      ctx.fillStyle = wash;
      ctx.fillRect(0, 0, w, h);
    } catch {
      /* papel liso */
    }
  }
  grain(ctx, w, h, 0.04);
}

function rule(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, color: string, lw = 3) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, lw);
}

function eyebrow(
  ctx: CanvasRenderingContext2D,
  cx: number,
  y: number,
  text: string,
  ink: string,
  size: number,
) {
  ctx.font = `700 ${size}px ${SANS}`;
  ctx.textAlign = 'center';
  const tw = ctx.measureText(text).width;
  try {
    (ctx as unknown as { letterSpacing: string }).letterSpacing = '5px';
  } catch {
    /* nada */
  }
  ctx.fillStyle = ink;
  ctx.globalAlpha = 0.75;
  ctx.fillText(text, cx, y);
  ctx.globalAlpha = 1;
  try {
    (ctx as unknown as { letterSpacing: string }).letterSpacing = '0px';
  } catch {
    /* nada */
  }
  const half = Math.min(300, tw / 2 + 60);
  rule(ctx, cx - half, y + 18, half * 2, ink, 2);
  ctx.globalAlpha = 1;
}

function scheduleEditorial(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  regionH: number,
  rows: { category: string; time: string }[],
  p: Palette,
  minRowH = 58,
) {
  if (rows.length === 0) {
    ctx.fillStyle = p.ink;
    ctx.globalAlpha = 0.6;
    ctx.font = `500 32px ${SANS}`;
    ctx.textAlign = 'center';
    ctx.fillText('Horarios a confirmar', x + w / 2, y + 60);
    ctx.globalAlpha = 1;
    return;
  }
  const fit = fitRows(rows, regionH, 96, minRowH, true);
  const list = fit.hidden > 0 ? [...fit.visible, { category: `+${fit.hidden} más`, time: '' }] : fit.visible;
  const rh = fit.rowH;
  list.forEach((row, i) => {
    const ry = y + i * rh;
    if (i > 0) {
      ctx.globalAlpha = 0.9;
      rule(ctx, x, ry + 2, w, p.ink, 2);
      ctx.globalAlpha = 0.14;
      rule(ctx, x, ry + 2, w, p.ink, 2);
      ctx.globalAlpha = 1;
    }
    ctx.textAlign = 'left';
    ctx.fillStyle = p.ink;
    let cs = Math.round(rh * 0.36);
    ctx.font = `700 ${cs}px ${DISPLAY}`;
    const maxCat = w - (row.time ? 340 : 60);
    while (cs > 16 && ctx.measureText(row.category.toUpperCase()).width > maxCat) {
      cs -= 2;
      ctx.font = `700 ${cs}px ${DISPLAY}`;
    }
    ctx.globalAlpha = row.category.startsWith('+') ? 0.55 : 1;
    ctx.fillText(row.category.toUpperCase(), x + 4, ry + rh / 2 + cs * 0.34);
    ctx.globalAlpha = 1;
    if (row.time) {
      // Línea de puntos editorial
      const catW = Math.min(maxCat, ctx.measureText(row.category.toUpperCase()).width);
      ctx.fillStyle = p.ink;
      ctx.globalAlpha = 0.3;
      ctx.font = `700 26px ${SANS}`;
      const dotsStart = x + 4 + catW + 24;
      const dotsEnd = x + w - 300;
      if (dotsEnd > dotsStart) {
        let dots = '';
        const n = Math.floor((dotsEnd - dotsStart) / 16);
        for (let k = 0; k < n; k++) dots += '· ';
        ctx.textAlign = 'left';
        ctx.fillText(dots, dotsStart, ry + rh / 2 + 8);
      }
      ctx.globalAlpha = 1;
      ctx.textAlign = 'right';
      const pending = row.time === 'A confirmar';
      ctx.fillStyle = pending ? p.ink : p.primary;
      ctx.globalAlpha = pending ? 0.55 : 1;
      ctx.font = `800 ${pending ? Math.round(rh * 0.3) : Math.round(rh * 0.44)}px ${DISPLAY}`;
      ctx.fillText(row.time, x + w - 4, ry + rh / 2 + rh * 0.16);
      ctx.globalAlpha = 1;
    }
  });
}

export function renderMinimalPremium(
  ctx: CanvasRenderingContext2D,
  content: FlyerContent,
  palette: Palette,
  format: FormatId,
  show: FlyerShow,
  assets: MinimalAssets,
) {
  const { w, h } = FORMATS[format];
  const p = { ...MINIMAL_PREMIUM_DEFAULTS, ...palette };
  const cx = w / 2;
  const ink = p.ink;

  paperBg(ctx, w, h, p, assets);

  // Bloque de color institucional (base o banda según formato)
  ctx.fillStyle = p.primary;
  if (format === 'square') {
    ctx.fillRect(0, 0, w, 26);
    ctx.fillRect(0, h - 120, w, 120);
  } else {
    ctx.fillRect(0, 0, w, 30);
    ctx.fillRect(0, h - 150, w, 150);
  }

  if (format === 'square') {
    eyebrow(ctx, cx, 80, 'CLUB SOCIAL Y DEPORTIVO SOLER', ink, 24);
    fitCenter(ctx, content.tournamentName.toUpperCase(), cx, 168, w - 110, 80, DISPLAY, 800, ink);
    if (show.round) {
      ctx.font = `800 36px ${DISPLAY}`;
      const t = content.roundLabel.toUpperCase();
      const pw = Math.min(w - 220, ctx.measureText(t).width + 72);
      roundRect(ctx, cx - pw / 2, 192, pw, 60, 8);
      ctx.fillStyle = ink;
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(t, cx, 234);
    }
    if (show.day) {
      ctx.fillStyle = p.primary;
      ctx.font = `800 42px ${DISPLAY}`;
      ctx.textAlign = 'center';
      ctx.fillText(content.dayTitle, cx, 318);
      ctx.fillStyle = ink;
      ctx.globalAlpha = 0.7;
      ctx.font = `500 26px ${SANS}`;
      ctx.fillText(content.daySubtitle, cx, 352);
      ctx.globalAlpha = 1;
    }
    const cy = 500;
    const r = 88;
    drawCrest(ctx, assets.home, 300, cy, r, content.homeName, { base: '#ffffff', ring: ink, glow: ink, glowAlpha: 0.12 });
    drawCrest(ctx, assets.away, 780, cy, r, content.awayName, { base: '#ffffff', ring: ink, glow: ink, glowAlpha: 0.12 });
    ctx.fillStyle = p.primary;
    ctx.font = `800 40px ${DISPLAY}`;
    ctx.textAlign = 'center';
    ctx.fillText('VS', cx, cy + 14);
    fitCenter(ctx, content.homeName.toUpperCase(), 300, 628, 380, 42, DISPLAY, 800, ink);
    fitCenter(ctx, content.awayName.toUpperCase(), 780, 628, 380, 42, DISPLAY, 800, ink);
    ctx.fillStyle = ink;
    ctx.globalAlpha = 0.55;
    ctx.font = `700 22px ${SANS}`;
    ctx.fillText('LOCAL', 300, 656);
    ctx.fillText('VISITANTE', 780, 656);
    ctx.globalAlpha = 1;
    rule(ctx, 90, 678, w - 180, p.primary, 5);
    ctx.fillStyle = ink;
    ctx.font = `800 34px ${DISPLAY}`;
    ctx.textAlign = 'left';
    ctx.fillText(`HORARIOS · ${content.rows.length} CAT.`, 90, 716);
    compactGrid(ctx, 90, 730, w - 180, 202, content.rows, {
      card: '#ffffff', category: ink, time: p.primary,
      timePending: 'rgba(20,20,20,0.45)', accent: p.primary,
      summaryBg: ink, summaryFg: '#ffffff',
    }, 62, 92);
    if (show.venue && content.venue) {
      drawPin(ctx, 90 + 12, 942, 24, p.primary);
      ctx.fillStyle = ink;
      ctx.font = `600 25px ${SANS}`;
      ctx.textAlign = 'left';
      ctx.fillText(content.venue.toUpperCase().slice(0, 48), 90 + 34, 950);
    }
    ctx.fillStyle = '#ffffff';
    ctx.font = `700 25px ${SANS}`;
    ctx.textAlign = 'center';
    ctx.fillText('UN LUGAR PARA COMPARTIR EN FAMILIA', cx, h - 72);
    ctx.globalAlpha = 0.8;
    ctx.font = `500 23px ${SANS}`;
    ctx.fillText('csdsoler.com.ar', cx, h - 40);
    ctx.globalAlpha = 1;
    return;
  }

  const isFeed = format === 'feed';
  const headTop = isFeed ? 56 : 78;
  eyebrow(ctx, cx, headTop, 'CLUB SOCIAL Y DEPORTIVO SOLER', ink, isFeed ? 25 : 29);
  fitCenter(ctx, content.tournamentName.toUpperCase(), cx, isFeed ? 150 : 220, w - 120, isFeed ? 92 : 128, DISPLAY, 800, ink);
  if (show.round) {
    ctx.font = `800 ${isFeed ? 40 : 46}px ${DISPLAY}`;
    const t = content.roundLabel.toUpperCase();
    const pw = Math.min(w - 200, ctx.measureText(t).width + 90);
    const py = isFeed ? 176 : 250;
    roundRect(ctx, cx - pw / 2, py, pw, isFeed ? 62 : 76, 8);
    ctx.fillStyle = p.primary;
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(t, cx, py + (isFeed ? 46 : 56));
  }
  if (show.day) {
    const dy = isFeed ? 296 : 430;
    ctx.fillStyle = p.primary;
    ctx.font = `800 ${isFeed ? 48 : 60}px ${DISPLAY}`;
    ctx.textAlign = 'center';
    const title = content.dayTitle;
    let ds = isFeed ? 48 : 60;
    ctx.font = `800 ${ds}px ${DISPLAY}`;
    while (ds > 20 && ctx.measureText(title).width > w - 140) {
      ds -= 2;
      ctx.font = `800 ${ds}px ${DISPLAY}`;
    }
    ctx.fillText(title, cx, dy);
    ctx.fillStyle = ink;
    ctx.globalAlpha = 0.7;
    ctx.font = `500 ${isFeed ? 30 : 34}px ${SANS}`;
    ctx.fillText(content.daySubtitle, cx, dy + (isFeed ? 42 : 48));
    ctx.globalAlpha = 1;
  }

  const cy = isFeed ? 498 : 860;
  const r = isFeed ? 100 : 158;
  const lx = isFeed ? 280 : 300;
  drawCrest(ctx, assets.home, lx, cy, r, content.homeName, { base: '#ffffff', ring: ink, glow: ink, glowAlpha: 0.14 });
  drawCrest(ctx, assets.away, w - lx, cy, r, content.awayName, { base: '#ffffff', ring: ink, glow: ink, glowAlpha: 0.14 });
  rule(ctx, lx + r + 24, cy - 2, cx - (lx + r + 24) - 70, ink, 3);
  rule(ctx, cx + 70, cy - 2, (w - lx - r - 24) - (cx + 70), ink, 3);
  ctx.fillStyle = p.primary;
  ctx.font = `800 ${isFeed ? 46 : 54}px ${DISPLAY}`;
  ctx.textAlign = 'center';
  ctx.fillText('VS', cx, cy + (isFeed ? 16 : 19));

  const ny = isFeed ? 656 : 1072;
  fitCenter(ctx, content.homeName.toUpperCase(), lx, ny, 400, isFeed ? 46 : 54, DISPLAY, 800, ink);
  fitCenter(ctx, content.awayName.toUpperCase(), w - lx, ny, 400, isFeed ? 46 : 54, DISPLAY, 800, ink);
  ctx.fillStyle = ink;
  ctx.globalAlpha = 0.55;
  ctx.font = `700 ${isFeed ? 24 : 28}px ${SANS}`;
  ctx.fillText('LOCAL', lx, ny + (isFeed ? 34 : 40));
  ctx.fillText('VISITANTE', w - lx, ny + (isFeed ? 34 : 40));
  ctx.globalAlpha = 1;

  const stY = isFeed ? 716 : 1170;
  rule(ctx, 90, stY, w - 180, p.primary, 6);
  ctx.fillStyle = ink;
  ctx.font = `800 ${isFeed ? 38 : 42}px ${DISPLAY}`;
  ctx.textAlign = 'left';
  ctx.fillText(`HORARIOS · ${content.rows.length} CAT.`, 90, stY + (isFeed ? 48 : 54));
  const gridTop = stY + (isFeed ? 60 : 74);
  const gridEnd = (isFeed ? h - 200 : h - 250);
  scheduleEditorial(ctx, 90, gridTop, w - 180, gridEnd - gridTop, content.rows, p, isFeed ? 52 : 58);

  if (show.venue && content.venue) {
    const vy = gridEnd + (isFeed ? 30 : 40);
    drawPin(ctx, 90 + 14, vy - 8, 28, p.primary);
    ctx.fillStyle = ink;
    ctx.font = `600 ${isFeed ? 28 : 30}px ${SANS}`;
    ctx.textAlign = 'left';
    const label = content.venue.toUpperCase();
    ctx.fillText(label.length > 52 ? label.slice(0, 52) : label, 90 + 40, vy);
  }

  // Pie dentro de la banda institucional
  ctx.fillStyle = '#ffffff';
  ctx.font = `700 ${isFeed ? 28 : 30}px ${SANS}`;
  ctx.textAlign = 'center';
  ctx.fillText('UN LUGAR PARA COMPARTIR EN FAMILIA', cx, h - (isFeed ? 88 : 92));
  ctx.globalAlpha = 0.85;
  ctx.font = `500 ${isFeed ? 26 : 28}px ${SANS}`;
  ctx.fillText('csdsoler.com.ar', cx, h - (isFeed ? 52 : 54));
  ctx.globalAlpha = 1;
}
