/**
 * Matchday Pro: noche de estadio, focos, dorado institucional y escudos héroes.
 * Cada formato tiene composición propia (no es recorte ni estiramiento).
 */
import type { FlyerContent, FlyerShow, FormatId, Palette } from '../types';
import { FORMATS } from '../types';
import {
  compactGrid,
  DISPLAY,
  SANS,
  drawCrest,
  drawPin,
  drawVsBadge,
  fitCenter,
  fitRows,
  grain,
  pinstripes,
  roundRect,
  spaced,
  unspaced,
  vignette,
} from './common';

export const MATCHDAY_PRO_DEFAULTS: Palette = {
  primary: '#B8202D',
  accent: '#D3AC45',
  bg: '#0B0C11',
  ink: '#FFFFFF',
};

export interface ProAssets {
  home: HTMLImageElement | null;
  away: HTMLImageElement | null;
  bg: HTMLImageElement | null;
}

function coverBg(ctx: CanvasRenderingContext2D, img: HTMLImageElement, w: number, h: number) {
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
}

function stadiumBg(ctx: CanvasRenderingContext2D, w: number, h: number, p: Palette, assets: ProAssets) {
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, w, h);
  if (assets.bg) {
    try {
      coverBg(ctx, assets.bg, w, h);
    } catch {
      /* fondo procedural como respaldo */
    }
    const shade = ctx.createLinearGradient(0, 0, 0, h);
    shade.addColorStop(0, 'rgba(5,6,10,0.72)');
    shade.addColorStop(0.55, 'rgba(5,6,10,0.55)');
    shade.addColorStop(1, 'rgba(5,6,10,0.88)');
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, w, h);
  } else {
    // Resplandor superior (focos del estadio)
    const top = ctx.createLinearGradient(0, 0, 0, h * 0.5);
    top.addColorStop(0, p.primary);
    top.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = top;
    ctx.fillRect(0, 0, w, h * 0.5);
    ctx.globalAlpha = 1;
    for (const fx of [w * 0.12, w * 0.88]) {
      const glow = ctx.createRadialGradient(fx, -h * 0.06, 10, fx, -h * 0.06, w * 0.55);
      glow.addColorStop(0, 'rgba(255,255,255,0.20)');
      glow.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h * 0.5);
    }
    // Brillo inferior de cancha
    const low = ctx.createRadialGradient(w / 2, h * 1.02, 10, w / 2, h * 1.02, w * 0.7);
    low.addColorStop(0, p.primary);
    low.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = low;
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 1;
    pinstripes(ctx, w, h);
  }
  grain(ctx, w, h, 0.05);
  vignette(ctx, w, h, 0.6);
}

function watermark(ctx: CanvasRenderingContext2D, w: number, y: number, text: string, size: number) {
  ctx.save();
  ctx.globalAlpha = 0.05;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `800 ${size}px ${DISPLAY}`;
  ctx.fillText(text.toUpperCase(), w / 2, y);
  ctx.restore();
}

function pill(ctx: CanvasRenderingContext2D, cx: number, y: number, text: string, bg: string, fg: string, size: number, padX: number) {
  ctx.font = `800 ${size}px ${DISPLAY}`;
  const pw = Math.min(1080 - 160, ctx.measureText(text).width + padX * 2);
  roundRect(ctx, cx - pw / 2, y, pw, size * 1.62, (size * 1.62) / 2);
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.fillStyle = fg;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(text, cx, y + size * 1.18);
}

function scheduleRows(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  regionH: number,
  rows: { category: string; time: string }[],
  p: Palette,
) {
  if (rows.length === 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.font = `500 32px ${SANS}`;
    ctx.textAlign = 'center';
    ctx.fillText('HORARIOS A CONFIRMAR', x + w / 2, y + 60);
    return;
  }
  const fit = fitRows(rows, regionH, 100, 56, true);
  const list = fit.hidden > 0 ? [...fit.visible, { category: `+${fit.hidden} categorías más`, time: '' }] : fit.visible;
  const rh = fit.rowH;
  list.forEach((row, i) => {
    const ry = y + i * rh;
    ctx.save();
    ctx.globalAlpha = 0.92;
    roundRect(ctx, x, ry, w, rh - 12, 18);
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,0.05)';
    ctx.fill();
    ctx.restore();
    // Lengüeta de acento
    ctx.fillStyle = row.time ? p.accent : 'rgba(255,255,255,0.25)';
    roundRect(ctx, x, ry, 10, rh - 12, 5);
    ctx.fill();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    let cs = Math.round(rh * 0.34);
    ctx.font = `700 ${cs}px ${DISPLAY}`;
    const maxCat = w - (row.time ? 330 : 120);
    while (cs > 16 && ctx.measureText(row.category.toUpperCase()).width > maxCat) {
      cs -= 2;
      ctx.font = `700 ${cs}px ${DISPLAY}`;
    }
    ctx.fillText(row.category.toUpperCase(), x + 34, ry + rh / 2 + cs * 0.32);
    if (row.time) {
      ctx.textAlign = 'right';
      const pending = row.time === 'A confirmar';
      ctx.fillStyle = pending ? 'rgba(255,255,255,0.55)' : p.accent;
      ctx.font = `800 ${pending ? Math.round(rh * 0.3) : Math.round(rh * 0.42)}px ${DISPLAY}`;
      ctx.fillText(row.time, x + w - 34, ry + rh / 2 + rh * 0.15);
    }
  });
}

function sectionTitle(ctx: CanvasRenderingContext2D, x: number, y: number, _w: number, text: string, accent: string, count: string | null) {
  ctx.fillStyle = accent;
  ctx.fillRect(x, y - 34, 8, 44);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#ffffff';
  ctx.font = `800 44px ${DISPLAY}`;
  ctx.fillText(text, x + 24, y);
  if (count) {
    ctx.font = `700 26px ${SANS}`;
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText(count, x + 24 + ctx.measureText(text).width + 90, y - 4);
  }
}

export function renderMatchdayPro(
  ctx: CanvasRenderingContext2D,
  content: FlyerContent,
  palette: Palette,
  format: FormatId,
  show: FlyerShow,
  assets: ProAssets,
) {
  const { w, h } = FORMATS[format];
  const p = { ...MATCHDAY_PRO_DEFAULTS, ...palette };
  const cx = w / 2;

  stadiumBg(ctx, w, h, p, assets);

  // Filete dorado superior
  ctx.fillStyle = p.accent;
  ctx.fillRect(0, 0, w, 10);

  // Identidad del club organizador
  spaced(ctx, 6);
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  unspaced(ctx);

  if (format === 'square') {
    ctx.font = `600 25px ${SANS}`;
    spaced(ctx, 5);
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillText('CLUB SOCIAL Y DEPORTIVO SOLER', cx, 56);
    unspaced(ctx);
    fitCenter(ctx, content.tournamentName.toUpperCase(), cx, 130, w - 130, 70, DISPLAY, 800, '#ffffff');
    if (show.round) pill(ctx, cx, 156, content.roundLabel.toUpperCase(), 'rgba(0,0,0,0.55)', '#ffffff', 36, 38);
    if (show.day) {
      fitCenter(ctx, content.dayTitle, cx, 278, w - 130, 42, DISPLAY, 800, p.accent);
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = `500 28px ${SANS}`;
      ctx.textAlign = 'center';
      ctx.fillText(content.daySubtitle, cx, 314);
    }
    const cy = 488;
    const r = 94;
    drawCrest(ctx, assets.home, 295, cy, r, content.homeName, { base: '#ffffff', ring: p.accent, glow: p.primary, glowAlpha: 0.5 });
    drawCrest(ctx, assets.away, 785, cy, r, content.awayName, { base: '#ffffff', ring: '#ffffff', glow: p.primary, glowAlpha: 0.4 });
    drawVsBadge(ctx, cx, cy, 86, '#101016', p.accent);
    fitCenter(ctx, content.homeName.toUpperCase(), 295, 624, 380, 42, DISPLAY, 800, '#ffffff');
    fitCenter(ctx, content.awayName.toUpperCase(), 785, 624, 380, 42, DISPLAY, 800, '#ffffff');
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = `700 24px ${SANS}`;
    ctx.textAlign = 'center';
    ctx.fillText('LOCAL', 295, 654);
    ctx.fillText('VISITANTE', 785, 654);

    sectionTitle(ctx, 90, 706, w - 180, 'HORARIOS', p.accent, `${content.rows.length} CAT.`);
    compactGrid(ctx, 90, 730, w - 180, 232, content.rows, {
      card: 'rgba(255,255,255,0.08)', category: '#ffffff', time: p.accent,
      timePending: 'rgba(255,255,255,0.55)', accent: p.accent,
      summaryBg: 'rgba(255,255,255,0.14)', summaryFg: '#ffffff',
    }, 68, 96);
    if (show.venue && content.venue) {
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = `600 26px ${SANS}`;
      ctx.textAlign = 'center';
      ctx.fillText(content.venue.toUpperCase().slice(0, 52), cx, 992);
    }
    if (show.footer) {
      ctx.fillStyle = p.accent;
      ctx.font = `700 25px ${SANS}`;
      ctx.textAlign = 'center';
      ctx.fillText('UN LUGAR PARA COMPARTIR EN FAMILIA  •  CSDSOLER.COM.AR', cx, 1028);
    }
    return;
  }

  const isFeed = format === 'feed';
  const eyebrowY = isFeed ? 64 : 92;
  const tourneyY = isFeed ? 150 : 208;
  const pillY = isFeed ? 178 : 244;
  const dayY = isFeed ? 292 : 408;
  const subY = isFeed ? 330 : 458;
  const venueY = isFeed ? 372 : 520;
  const crestY = isFeed ? 566 : 900;
  const crestR = isFeed ? 116 : 168;
  const crestX = isFeed ? 270 : 300;
  const nameY = isFeed ? 742 : 1132;
  const tagY = isFeed ? 774 : 1174;
  const schedTitleY = isFeed ? 818 : 1268;
  const schedY = isFeed ? 844 : 1300;
  const schedEnd = isFeed ? 1200 : 1720;
  const footY = isFeed ? 1256 : 1804;

  ctx.font = `600 ${isFeed ? 26 : 30}px ${SANS}`;
  spaced(ctx, 6);
  ctx.fillText('CLUB SOCIAL Y DEPORTIVO SOLER', cx, eyebrowY);
  unspaced(ctx);

  fitCenter(ctx, content.tournamentName.toUpperCase(), cx, tourneyY, w - 150, isFeed ? 84 : 104, DISPLAY, 800, '#ffffff');
  if (show.round) pill(ctx, cx, pillY, content.roundLabel.toUpperCase(), p.primary, '#ffffff', isFeed ? 40 : 52, 46);

  watermark(ctx, w, crestY, content.roundLabel, isFeed ? 200 : 260);

  if (show.day) {
    fitCenter(ctx, content.dayTitle, cx, dayY, w - 150, isFeed ? 48 : 58, DISPLAY, 800, p.accent);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = `500 ${isFeed ? 32 : 36}px ${SANS}`;
    ctx.textAlign = 'center';
    ctx.fillText(content.daySubtitle, cx, subY);
  }
  if (show.venue && content.venue) {
    const text = content.venue.toUpperCase().slice(0, 46);
    ctx.font = `600 ${isFeed ? 30 : 34}px ${SANS}`;
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.textAlign = 'center';
    const tw = Math.min(ctx.measureText(text).width, w - 180);
    drawPin(ctx, cx - tw / 2 - 30, venueY - 10, 30, p.accent);
    ctx.fillText(text, cx + 14, venueY);
  }

  const ax = w - crestX;
  drawCrest(ctx, assets.home, crestX, crestY, crestR, content.homeName, { base: '#ffffff', ring: p.accent, glow: p.primary, glowAlpha: 0.55 });
  drawCrest(ctx, assets.away, ax, crestY, crestR, content.awayName, { base: '#ffffff', ring: '#ffffff', glow: p.primary, glowAlpha: 0.45 });
  drawVsBadge(ctx, cx, crestY, isFeed ? 104 : 124, '#101016', p.accent);

  fitCenter(ctx, content.homeName.toUpperCase(), crestX, nameY, 380, isFeed ? 46 : 56, DISPLAY, 800, '#ffffff');
  fitCenter(ctx, content.awayName.toUpperCase(), ax, nameY, 380, isFeed ? 46 : 56, DISPLAY, 800, '#ffffff');
  ctx.fillStyle = 'rgba(255,255,255,0.62)';
  ctx.font = `700 ${isFeed ? 27 : 30}px ${SANS}`;
  ctx.textAlign = 'center';
  ctx.fillText('LOCAL', crestX, tagY);
  ctx.fillText('VISITANTE', ax, tagY);

  sectionTitle(ctx, 90, schedTitleY, w - 180, 'HORARIOS', p.accent, `${content.rows.length} CAT.`);
  if (!isFeed || content.rows.length <= 5) {
    scheduleRows(ctx, 90, schedY, w - 180, schedEnd - schedY, content.rows, p);
  } else {
    compactGrid(ctx, 90, schedY + 6, w - 180, schedEnd - schedY - 6, content.rows, {
      card: 'rgba(255,255,255,0.08)', category: '#ffffff', time: p.accent,
      timePending: 'rgba(255,255,255,0.55)', accent: p.accent,
      summaryBg: 'rgba(255,255,255,0.14)', summaryFg: '#ffffff',
    });
  }

  if (show.footer) {
    ctx.textAlign = 'center';
    ctx.fillStyle = p.accent;
    ctx.font = `700 ${isFeed ? 30 : 34}px ${SANS}`;
    ctx.fillText('UN LUGAR PARA COMPARTIR EN FAMILIA', cx, footY);
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.font = `500 ${isFeed ? 28 : 30}px ${SANS}`;
    ctx.fillText('csdsoler.com.ar', cx, footY + (isFeed ? 42 : 52));
  }
}
