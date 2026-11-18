/**
 * Editorial Clean: premium claro, marco editorial, tipografía protagonista,
 * mucho aire. Escudos en placa tono-papel (nunca círculo blanco puro) o
 * flotantes según tratamiento. Horarios refinados con líderes de puntos.
 */
import type { FlyerContent, FlyerOptions, Palette } from '../types';
import { FORMATS } from '../types';
import {
  DISPLAY,
  SANS,
  drawPin,
  fitCenter,
  grain,
  roundRect,
} from './common';
import { paintCrest } from '../sections/crests';
import { paintSchedule, type ScheduleStyle } from '../sections/schedule';

export const MINIMAL_PREMIUM_DEFAULTS: Palette = {
  primary: '#B8202D',
  accent: '#B8202D',
  bg: '#F5F2EB',
  ink: '#161616',
};

export interface MinimalAssets {
  home: HTMLImageElement | null;
  away: HTMLImageElement | null;
  bg: HTMLImageElement | null;
}

function paperBg(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  p: Palette,
  assets: MinimalAssets,
  intensity: FlyerOptions['intensity'],
) {
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, w, h);
  if (assets.bg) {
    try {
      ctx.save();
      ctx.globalAlpha = 0.12;
      const img = assets.bg;
      const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
      const dw = img.naturalWidth * scale;
      const dh = img.naturalHeight * scale;
      ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
      ctx.restore();
      const wash = ctx.createLinearGradient(0, 0, 0, h);
      wash.addColorStop(0, p.bg);
      wash.addColorStop(0.4, `${p.bg}CC`);
      wash.addColorStop(1, `${p.bg}F2`);
      ctx.fillStyle = wash;
      ctx.fillRect(0, 0, w, h);
    } catch {
      /* papel liso */
    }
  }
  if (intensity !== 'low') grain(ctx, w, h, intensity === 'high' ? 0.05 : 0.035);
  // Marco editorial fino
  ctx.save();
  ctx.strokeStyle = p.ink;
  ctx.globalAlpha = intensity === 'low' ? 0.25 : 0.4;
  ctx.lineWidth = 3;
  ctx.strokeRect(26, 26, w - 52, h - 52);
  ctx.restore();
}

function scheduleStyle(p: Palette): ScheduleStyle {
  return {
    rowBg: '#ffffff',
    rowBgAlt: '#ffffff',
    catColor: p.ink,
    timeColor: p.primary,
    timePending: 'rgba(22,22,22,0.45)',
    accent: p.primary,
    summaryBg: p.ink,
    summaryFg: '#ffffff',
    leaderDots: true,
    radius: 10,
  };
}

export function renderMinimalPremium(
  ctx: CanvasRenderingContext2D,
  content: FlyerContent,
  opts: FlyerOptions,
  palette: Palette,
  assets: MinimalAssets,
) {
  const { w, h } = FORMATS[opts.format];
  const p = { ...MINIMAL_PREMIUM_DEFAULTS, ...palette };
  const show = opts.show;
  const ink = p.ink;
  const left = opts.composition === 'asymmetric';
  const tx = left ? 110 : w / 2;
  /** En cuadrado la asimétrica solo alinea header/schedule; el duelo va centrado. */
  const asym = left && opts.format !== 'square';
  const tAlign: CanvasTextAlign = left ? 'left' : 'center';
  const compact = opts.composition === 'compact';
  const impact = opts.composition === 'impact';
  const crestScale = compact ? 0.82 : impact ? 1.14 : 1;

  paperBg(ctx, w, h, p, assets, opts.intensity);

  // Banda institucional inferior solo si hay pie que mostrar
  const hasFooter = show.slogan || show.web;
  if (hasFooter) {
    ctx.fillStyle = p.primary;
    ctx.fillRect(0, h - (opts.format === 'square' ? 120 : 150), w, opts.format === 'square' ? 120 : 150);
  }

  const eyebrow = (y: number, size: number) => {
    ctx.font = `700 ${size}px ${SANS}`;
    try {
      (ctx as unknown as { letterSpacing: string }).letterSpacing = '5px';
    } catch {
      /* nada */
    }
    ctx.fillStyle = ink;
    ctx.globalAlpha = 0.7;
    ctx.textAlign = tAlign;
    ctx.fillText('CLUB SOCIAL Y DEPORTIVO SOLER', tx, y);
    ctx.globalAlpha = 1;
    try {
      (ctx as unknown as { letterSpacing: string }).letterSpacing = '0px';
    } catch {
      /* nada */
    }
    const tw = ctx.measureText('CLUB SOCIAL Y DEPORTIVO SOLER').width;
    ctx.fillStyle = ink;
    ctx.globalAlpha = 0.5;
    if (left) ctx.fillRect(tx, y + 16, Math.min(420, tw), 2);
    else ctx.fillRect(tx - Math.min(300, tw / 2), y + 16, Math.min(600, tw), 2);
    ctx.globalAlpha = 1;
  };

  const titleBlock = (topY: number, titleBase: number) => {
    let y = topY;
    eyebrow(y, opts.format === 'square' ? 24 : 26);
    y += titleBase * 0.95;
    if (show.tournament) {
      if (left) {
        let s = titleBase;
        ctx.font = `800 ${s}px ${DISPLAY}`;
        while (s > 20 && ctx.measureText(content.tournamentName.toUpperCase()).width > w - 220) {
          s -= 2;
          ctx.font = `800 ${s}px ${DISPLAY}`;
        }
        ctx.fillStyle = ink;
        ctx.textAlign = 'left';
        ctx.fillText(content.tournamentName.toUpperCase(), tx, y);
      } else {
        fitCenter(ctx, content.tournamentName.toUpperCase(), w / 2, y, w - 140, titleBase, DISPLAY, 800, ink);
      }
      y += titleBase * 0.42;
    }
    if (show.round) {
      const t = content.roundLabel.toUpperCase();
      ctx.font = `800 ${Math.round(titleBase * 0.42)}px ${DISPLAY}`;
      const pw = Math.min(w - 220, ctx.measureText(t).width + 80);
      const ph = Math.round(titleBase * 0.72);
      const px = left ? tx : w / 2 - pw / 2;
      roundRect(ctx, px, y, pw, ph, 8);
      ctx.fillStyle = opts.intensity === 'high' ? p.primary : ink;
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(t, left ? px + pw / 2 : w / 2, y + ph * 0.7);
      y += ph + titleBase * 0.28;
    }
    if (show.day) {
      if (opts.dateStyle === 'short') {
        ctx.fillStyle = p.primary;
        ctx.font = `800 ${Math.round(titleBase * 0.52)}px ${DISPLAY}`;
        ctx.textAlign = tAlign;
        ctx.fillText(content.daySubtitle, tx, y);
      } else {
        const anchor = left ? tx + (w - 220) / 2 : w / 2;
        fitCenter(ctx, content.dayTitle, anchor, y, w - 160, Math.round(titleBase * 0.52), DISPLAY, 800, p.primary);
        if (opts.dateStyle === 'both') {
          ctx.fillStyle = ink;
          ctx.globalAlpha = 0.7;
          ctx.font = `500 ${Math.round(titleBase * 0.3)}px ${SANS}`;
          ctx.textAlign = tAlign;
          ctx.fillText(content.daySubtitle, tx, y + Math.round(titleBase * 0.38));
          ctx.globalAlpha = 1;
        }
      }
    }
    return y;
  };

  const matchup = (cy: number, r: number, nameY: number) => {
    const treat = opts.crest === 'auto' ? 'plate' : opts.crest;
    const colors = { ring: ink, glow: ink, plate: '#EAE4D6', plateInk: ink };
    const lx = asym ? 320 : opts.format === 'square' ? 300 : 300;
    const rx = asym ? 760 : w - lx;
    paintCrest(ctx, assets.home, lx, cy, r * crestScale, content.homeName, treat, colors, 0.14);
    paintCrest(ctx, assets.away, rx, cy + (left ? r * 0.3 : 0), r * crestScale * (left ? 0.88 : 1), content.awayName, treat, colors, 0.14);
    // VS editorial con filetes
    ctx.fillStyle = p.primary;
    ctx.font = `800 ${Math.round(r * 0.34)}px ${DISPLAY}`;
    ctx.textAlign = 'center';
    const vsx = (lx + rx) / 2;
    ctx.fillText('VS', vsx, cy + r * 0.12);
    ctx.fillStyle = ink;
    ctx.globalAlpha = 0.4;
    ctx.fillRect(lx + r * crestScale + 20, cy - 1, Math.max(10, vsx - 60 - (lx + r * crestScale + 20)), 2);
    ctx.fillRect(vsx + 60, cy - 1, Math.max(10, rx - r * crestScale - 20 - (vsx + 60)), 2);
    ctx.globalAlpha = 1;
    const drawNames = (ny: number) => {
      if (asym) {
        ctx.textAlign = 'left';
        ctx.fillStyle = ink;
        let s1 = Math.round(r * 0.36);
        ctx.font = `800 ${s1}px ${DISPLAY}`;
        while (s1 > 16 && ctx.measureText(content.homeName.toUpperCase()).width > w - 220) {
          s1 -= 2;
          ctx.font = `800 ${s1}px ${DISPLAY}`;
        }
        ctx.fillText(content.homeName.toUpperCase(), tx, ny);
        if (show.homeAway) {
          ctx.fillStyle = p.primary;
          ctx.font = `700 ${Math.round(r * 0.2)}px ${SANS}`;
          ctx.fillText('LOCAL', tx, ny + 32);
        }
        ctx.fillStyle = ink;
        ctx.globalAlpha = 0.75;
        let s2 = Math.round(r * 0.3);
        ctx.font = `800 ${s2}px ${DISPLAY}`;
        while (s2 > 14 && ctx.measureText(content.awayName.toUpperCase()).width > w - 220) {
          s2 -= 2;
          ctx.font = `800 ${s2}px ${DISPLAY}`;
        }
        ctx.fillText(content.awayName.toUpperCase(), tx, ny + 32 + 52);
        ctx.globalAlpha = 1;
        if (show.homeAway) {
          ctx.fillStyle = ink;
          ctx.globalAlpha = 0.55;
          ctx.font = `700 ${Math.round(r * 0.2)}px ${SANS}`;
          ctx.fillText('VISITANTE', tx, ny + 32 + 52 + 28);
          ctx.globalAlpha = 1;
        }
      } else {
        fitCenter(ctx, content.homeName.toUpperCase(), lx, ny, 400, Math.round(r * 0.36), DISPLAY, 800, ink);
        fitCenter(ctx, content.awayName.toUpperCase(), rx, ny, 400, Math.round(r * 0.36), DISPLAY, 800, ink);
      }
    };
    drawNames(nameY);
    if (show.homeAway && !asym) {
      ctx.fillStyle = ink;
      ctx.globalAlpha = 0.55;
      ctx.font = `700 ${Math.round(r * 0.2)}px ${SANS}`;
      ctx.textAlign = 'center';
      ctx.fillText('LOCAL', lx, nameY + 34);
      ctx.fillText('VISITANTE', rx, nameY + 34);
      ctx.globalAlpha = 1;
    }
    return { lx, rx };
  };

  const scheduleBlock = (ruleY: number, gridEnd: number, titleSize: number) => {
    ctx.fillStyle = p.primary;
    if (left) ctx.fillRect(tx, ruleY, 64, 6);
    else ctx.fillRect(90, ruleY, w - 180, 6);
    const titleY = ruleY + titleSize + 10;
    ctx.fillStyle = ink;
    ctx.font = `800 ${titleSize}px ${DISPLAY}`;
    const head = `HORARIOS · ${content.rows.length} CAT.`;
    if (left) {
      ctx.textAlign = 'left';
      ctx.fillText(head, tx, titleY);
    } else {
      ctx.textAlign = 'center';
      ctx.fillText(head, w / 2, titleY);
    }
    const gridY = titleY + 20;
    paintSchedule(ctx, opts.schedule, left ? tx : 90, gridY, left ? w - tx - 70 : w - 180, gridEnd - gridY, content.rows, scheduleStyle(p), false, 52);
  };

  const footer = () => {
    if (!hasFooter) return;
    const bandTop = h - (opts.format === 'square' ? 120 : 150);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    if (show.slogan) {
      ctx.font = `700 ${opts.format === 'square' ? 25 : 30}px ${SANS}`;
      ctx.fillText('UN LUGAR PARA COMPARTIR EN FAMILIA', w / 2, bandTop + (show.web ? 62 : 88));
    }
    if (show.web) {
      ctx.globalAlpha = 0.85;
      ctx.font = `500 ${opts.format === 'square' ? 23 : 28}px ${SANS}`;
      ctx.fillText('csdsoler.com.ar', w / 2, bandTop + (show.slogan ? 100 : 88));
      ctx.globalAlpha = 1;
    }
  };

  /** En asimétrica los nombres se apilan: se baja el bloque de horarios. */
  const stackGap = asym ? 96 : 0;
  if (opts.format === 'square') {
    titleBlock(76, 76);
    matchup(500, 88, 622);
    scheduleBlock(676, 906, 32);
    if (show.venue && content.venue) {
      drawPin(ctx, (left ? tx : 90) + 12, 918, 22, p.primary);
      ctx.fillStyle = ink;
      ctx.font = `600 24px ${SANS}`;
      ctx.textAlign = 'left';
      ctx.fillText(content.venue.toUpperCase().slice(0, 48), (left ? tx : 90) + 40, 926);
    }
    footer();
    return;
  }
  const isFeed = opts.format === 'feed';
  titleBlock(isFeed ? 58 : 74, isFeed ? 88 : impact ? 132 : 118);
  if (isFeed) {
    matchup(498, 100, 652);
    scheduleBlock(716 + stackGap, 1150, 36);
    if (show.venue && content.venue) {
      drawPin(ctx, (left ? tx : 90) + 13, 1162, 26, p.primary);
      ctx.fillStyle = ink;
      ctx.font = `600 27px ${SANS}`;
      ctx.textAlign = 'left';
      ctx.fillText(content.venue.toUpperCase().slice(0, 50), (left ? tx : 90) + 42, 1170);
    }
  } else {
    matchup(850, 158, 1058);
    scheduleBlock(1150 + stackGap, hasFooter ? 1690 : 1790, 42);
    if (show.venue && content.venue) {
      const vy = (hasFooter ? 1690 : 1790) + 38;
      drawPin(ctx, (left ? tx : 90) + 14, vy - 8, 28, p.primary);
      ctx.fillStyle = ink;
      ctx.font = `600 30px ${SANS}`;
      ctx.textAlign = 'left';
      ctx.fillText(content.venue.toUpperCase().slice(0, 50), (left ? tx : 90) + 44, vy);
    }
  }
  footer();
}
