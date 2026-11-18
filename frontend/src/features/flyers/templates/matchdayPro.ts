/**
 * Matchday Stadium: noche de estadio con profundidad. Focos suaves, neblina
 * de cancha, VS protagonista con doble anillo, escudos con presencia
 * (transparentes + glow, nunca base blanca). Sin diagonales sobre la info.
 */
import type { FlyerContent, FlyerOptions, Palette } from '../types';
import { FORMATS } from '../types';
import {
  DISPLAY,
  SANS,
  drawPin,
  fitCenter,
  grain,
  vignette,
} from './common';
import { paintCrest } from '../sections/crests';
import { paintSchedule, type ScheduleStyle } from '../sections/schedule';

export const MATCHDAY_PRO_DEFAULTS: Palette = {
  primary: '#B8202D',
  accent: '#D3AC45',
  bg: '#0A0C12',
  ink: '#FFFFFF',
};

export interface StadiumAssets {
  home: HTMLImageElement | null;
  away: HTMLImageElement | null;
  bg: HTMLImageElement | null;
}

function stadiumBg(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  p: Palette,
  assets: StadiumAssets,
  intensity: FlyerOptions['intensity'],
) {
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, w, h);
  if (assets.bg) {
    try {
      ctx.save();
      ctx.globalAlpha = intensity === 'low' ? 0.15 : 0.32;
      const img = assets.bg;
      const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
      ctx.drawImage(img, (w - img.naturalWidth * scale) / 2, (h - img.naturalHeight * scale) / 2, img.naturalWidth * scale, img.naturalHeight * scale);
      ctx.restore();
      const shade = ctx.createLinearGradient(0, 0, 0, h);
      shade.addColorStop(0, 'rgba(5,6,10,0.78)');
      shade.addColorStop(0.5, 'rgba(5,6,10,0.55)');
      shade.addColorStop(1, 'rgba(5,6,10,0.9)');
      ctx.fillStyle = shade;
      ctx.fillRect(0, 0, w, h);
    } catch {
      /* fondo procedural */
    }
  } else if (intensity !== 'low') {
    for (const fx of [w * 0.1, w * 0.9]) {
      const glow = ctx.createRadialGradient(fx, -h * 0.05, 10, fx, -h * 0.05, w * 0.5);
      glow.addColorStop(0, 'rgba(255,244,220,0.20)');
      glow.addColorStop(1, 'rgba(255,244,220,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h * 0.45);
    }
    const top = ctx.createLinearGradient(0, 0, 0, h * 0.45);
    top.addColorStop(0, p.primary);
    top.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save();
    ctx.globalAlpha = intensity === 'high' ? 0.5 : 0.34;
    ctx.fillStyle = top;
    ctx.fillRect(0, 0, w, h * 0.45);
    ctx.restore();
    const low = ctx.createRadialGradient(w / 2, h * 1.02, 10, w / 2, h * 1.02, w * 0.72);
    low.addColorStop(0, p.primary);
    low.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save();
    ctx.globalAlpha = 0.32;
    ctx.fillStyle = low;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
  if (intensity === 'high') {
    // Haces de luz horizontales, muy sutiles, detrás del contenido.
    ctx.save();
    ctx.globalAlpha = 0.06;
    ctx.fillStyle = '#fff8e6';
    ctx.fillRect(0, h * 0.3, w, 3);
    ctx.fillRect(0, h * 0.62, w, 2);
    ctx.fillRect(0, h * 0.8, w, 3);
    ctx.restore();
  }
  grain(ctx, w, h, intensity === 'high' ? 0.06 : intensity === 'medium' ? 0.045 : 0);
  vignette(ctx, w, h, intensity === 'low' ? 0.32 : 0.58);
}

function watermarkOutline(ctx: CanvasRenderingContext2D, w: number, y: number, text: string, size: number) {
  ctx.save();
  ctx.globalAlpha = 0.07;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `800 ${size}px ${DISPLAY}`;
  ctx.strokeText(text.toUpperCase(), w / 2, y);
  ctx.restore();
}

/** VS protagonista: doble anillo luminoso sobre medallón oscuro. */
function vsHero(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, p: Palette, intensity: FlyerOptions['intensity']) {
  ctx.save();
  if (intensity !== 'low') {
    ctx.shadowColor = p.accent;
    ctx.shadowBlur = r * 0.6;
  }
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = '#101016';
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.lineWidth = Math.max(4, r * 0.09);
  ctx.strokeStyle = p.accent;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.78, 0, Math.PI * 2);
  ctx.lineWidth = Math.max(1.5, r * 0.03);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `800 ${Math.round(r * 0.62)}px ${DISPLAY}`;
  ctx.fillText('VS', cx, cy + r * 0.04);
  ctx.restore();
}

function scheduleStyle(p: Palette): ScheduleStyle {
  return {
    rowBg: 'rgba(255,255,255,0.09)',
    rowBgAlt: 'rgba(255,255,255,0.045)',
    catColor: '#ffffff',
    timeColor: p.accent,
    timePending: 'rgba(255,255,255,0.55)',
    accent: p.accent,
    summaryBg: 'rgba(255,255,255,0.16)',
    summaryFg: '#ffffff',
    leaderDots: false,
    radius: 16,
  };
}

export function renderMatchdayPro(
  ctx: CanvasRenderingContext2D,
  content: FlyerContent,
  opts: FlyerOptions,
  palette: Palette,
  assets: StadiumAssets,
) {
  const { w, h } = FORMATS[opts.format];
  const p = { ...MATCHDAY_PRO_DEFAULTS, ...palette };
  const show = opts.show;
  const cx = w / 2;
  const left = opts.composition === 'asymmetric';
  const tx = left ? 110 : cx;
  /** En cuadrado la asimétrica solo alinea header/schedule; el duelo va centrado. */
  const asym = left && opts.format !== 'square';
  const compact = opts.composition === 'compact';
  const impact = opts.composition === 'impact';
  const cs = compact ? 0.84 : impact ? 1.2 : 1;

  stadiumBg(ctx, w, h, p, assets, opts.intensity);
  ctx.fillStyle = p.accent;
  ctx.fillRect(0, 0, w, 10);

  const header = (eyebrowY: number, titleY: number, titleBase: number, pillY: number, dayY: number, subY: number, venueY: number) => {
    ctx.textAlign = left ? 'left' : 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = `600 ${opts.format === 'square' ? 25 : 29}px ${SANS}`;
    ctx.fillText('CLUB SOCIAL Y DEPORTIVO SOLER', tx, eyebrowY);
    if (show.tournament) {
      if (left) {
        let s = Math.round(titleBase * cs);
        ctx.font = `800 ${s}px ${DISPLAY}`;
        while (s > 20 && ctx.measureText(content.tournamentName.toUpperCase()).width > w - 220) {
          s -= 2;
          ctx.font = `800 ${s}px ${DISPLAY}`;
        }
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'left';
        ctx.fillText(content.tournamentName.toUpperCase(), tx, titleY);
      } else {
        fitCenter(ctx, content.tournamentName.toUpperCase(), cx, titleY, w - 140, Math.round(titleBase * cs), DISPLAY, 800, '#ffffff');
      }
    }
    if (show.round) {
      const t = content.roundLabel.toUpperCase();
      ctx.font = `800 ${Math.round(titleBase * 0.48)}px ${DISPLAY}`;
      const pw = Math.min(w - 220, ctx.measureText(t).width + 100);
      const ph = Math.round(titleBase * 0.78);
      const px = left ? tx : cx - pw / 2;
      ctx.save();
      ctx.shadowColor = p.primary;
      ctx.shadowBlur = opts.intensity === 'low' ? 0 : 24;
      ctx.fillStyle = p.primary;
      ctx.beginPath();
      ctx.roundRect(px, pillY, pw, ph, ph / 2);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.fillText(t, left ? px + pw / 2 : cx, pillY + ph * 0.7);
    }
    if (show.day) {
      ctx.textAlign = left ? 'left' : 'center';
      if (opts.dateStyle === 'short') {
        ctx.fillStyle = p.accent;
        ctx.font = `800 ${Math.round(titleBase * 0.56)}px ${DISPLAY}`;
        ctx.fillText(content.daySubtitle, tx, dayY);
      } else if (left) {
        let s = Math.round(titleBase * 0.56);
        ctx.font = `800 ${s}px ${DISPLAY}`;
        while (s > 20 && ctx.measureText(content.dayTitle).width > w - 220) {
          s -= 2;
          ctx.font = `800 ${s}px ${DISPLAY}`;
        }
        ctx.fillStyle = p.accent;
        ctx.textAlign = 'left';
        ctx.fillText(content.dayTitle, tx, dayY);
        if (opts.dateStyle === 'both') {
          ctx.fillStyle = 'rgba(255,255,255,0.88)';
          ctx.font = `500 ${Math.round(titleBase * 0.3)}px ${SANS}`;
          ctx.fillText(content.daySubtitle, tx, subY);
        }
      } else {
        const anchor = left ? tx + (w - 220) / 2 : cx;
        fitCenter(ctx, content.dayTitle, anchor, dayY, w - 150, Math.round(titleBase * 0.56), DISPLAY, 800, p.accent);
        if (opts.dateStyle === 'both') {
          ctx.fillStyle = 'rgba(255,255,255,0.88)';
          ctx.font = `500 ${Math.round(titleBase * 0.3)}px ${SANS}`;
          ctx.fillText(content.daySubtitle, tx, subY);
        }
      }
    }
    if (show.venue && content.venue) {
      const label = content.venue.toUpperCase().slice(0, 46);
      ctx.font = `600 ${Math.round(titleBase * 0.3)}px ${SANS}`;
      if (left) {
        drawPin(ctx, tx + 14, venueY - 10, 26, p.accent);
        ctx.fillStyle = 'rgba(255,255,255,0.92)';
        ctx.textAlign = 'left';
        ctx.fillText(label, tx + 48, venueY);
      } else {
        const tw = Math.min(ctx.measureText(label).width, w - 200);
        drawPin(ctx, cx - tw / 2 - 30, venueY - 10, 26, p.accent);
        ctx.fillStyle = 'rgba(255,255,255,0.92)';
        ctx.textAlign = 'center';
        ctx.fillText(label, cx + 8, venueY);
      }
    }
  };

  const matchup = (crestY: number, crestR: number, nameY: number, tagY: number) => {
    const treat = opts.crest === 'auto' ? 'glow' : opts.crest;
    const colors = { ring: p.accent, glow: p.primary, plate: 'rgba(255,255,255,0.08)', plateInk: '#ffffff' };
    const lx = asym ? Math.round(w * 0.32) : 300;
    const rx = asym ? Math.round(w * 0.76) : w - 300;
    const rA = Math.round(crestR * cs * (asym ? 1.08 : 1));
    const rB = Math.round(crestR * cs * (asym ? 0.85 : 1));
    const yB = crestY + (asym ? Math.round(crestR * 0.25) : 0);
    if (opts.format === 'story') {
      watermarkOutline(ctx, w, crestY, content.roundLabel, Math.round(crestR * 1.4));
    }
    paintCrest(ctx, assets.home, lx, crestY, rA, content.homeName, treat, colors, opts.intensity === 'high' ? 0.75 : 0.5);
    paintCrest(ctx, assets.away, rx, yB, rB, content.awayName, treat, colors, opts.intensity === 'high' ? 0.65 : 0.45);
    vsHero(ctx, cx, Math.round((crestY + yB) / 2), Math.round(crestR * (impact ? 0.52 : 0.44)), p, opts.intensity);
    if (asym) {
      ctx.textAlign = 'left';
      let s1 = Math.round(crestR * 0.34);
      ctx.font = `800 ${s1}px ${DISPLAY}`;
      while (s1 > 18 && ctx.measureText(content.homeName.toUpperCase()).width > w - 220) {
        s1 -= 2;
        ctx.font = `800 ${s1}px ${DISPLAY}`;
      }
      ctx.fillStyle = '#fff';
      ctx.fillText(content.homeName.toUpperCase(), tx, nameY);
      ctx.fillStyle = p.accent;
      ctx.font = `700 ${Math.round(crestR * 0.19)}px ${SANS}`;
      ctx.fillText('LOCAL', tx, nameY + 34);
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      let s2 = Math.round(crestR * 0.28);
      ctx.font = `800 ${s2}px ${DISPLAY}`;
      while (s2 > 16 && ctx.measureText(content.awayName.toUpperCase()).width > w - 220) {
        s2 -= 2;
        ctx.font = `800 ${s2}px ${DISPLAY}`;
      }
      ctx.fillText(content.awayName.toUpperCase(), tx, nameY + 34 + 56);
      if (show.homeAway) {
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.font = `700 ${Math.round(crestR * 0.19)}px ${SANS}`;
        ctx.fillText('VISITANTE', tx, nameY + 34 + 56 + 30);
      }
    } else {
      fitCenter(ctx, content.homeName.toUpperCase(), lx, nameY, 400, Math.round(crestR * 0.34), DISPLAY, 800, '#ffffff');
      fitCenter(ctx, content.awayName.toUpperCase(), rx, nameY, 400, Math.round(crestR * 0.34), DISPLAY, 800, '#ffffff');
    }
    if (show.homeAway && !asym) {
      ctx.font = `700 ${Math.round(crestR * 0.19)}px ${SANS}`;
      ctx.textAlign = 'center';
      ctx.fillStyle = p.accent;
      ctx.fillText('LOCAL', lx, tagY);
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillText('VISITANTE', rx, tagY);
    }
  };

  /** En asimétrica los nombres se apilan: se baja el bloque de horarios. */
  const stackGap = asym ? 96 : 0;

  const scheduleBlock = (titleY: number, gridY: number, gridEnd: number) => {
    ctx.textAlign = left ? 'left' : 'center';
    ctx.fillStyle = p.accent;
    ctx.font = `800 42px ${DISPLAY}`;
    const hw = ctx.measureText('HORARIOS').width;
    if (left) {
      ctx.textAlign = 'left';
      ctx.fillText('HORARIOS', tx, titleY);
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.font = `700 25px ${SANS}`;
      ctx.fillText(`${content.rows.length} CAT.`, tx + hw + 24, titleY - 4);
    } else {
      ctx.textAlign = 'center';
      ctx.fillText('HORARIOS', cx, titleY);
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.font = `700 25px ${SANS}`;
      ctx.fillText(`${content.rows.length} CAT.`, cx + 200, titleY - 4);
    }
    paintSchedule(ctx, opts.schedule, left ? tx : 90, gridY, left ? w - tx - 70 : w - 180, gridEnd - gridY, content.rows, scheduleStyle(p), false, 54);
  };

  const footer = (sloganY: number) => {
    ctx.textAlign = 'center';
    if (show.slogan) {
      ctx.fillStyle = p.accent;
      ctx.font = `700 ${opts.format === 'square' ? 25 : 33}px ${SANS}`;
      ctx.fillText('UN LUGAR PARA COMPARTIR EN FAMILIA', cx, sloganY);
    }
    if (show.web) {
      ctx.fillStyle = 'rgba(255,255,255,0.65)';
      ctx.font = `500 ${opts.format === 'square' ? 23 : 29}px ${SANS}`;
      ctx.fillText('csdsoler.com.ar', cx, sloganY + (show.slogan ? 48 : 0));
    }
  };

  if (opts.format === 'square') {
    header(58, 130, 70, 158, 278, 312, 352);
    matchup(492, 96, 626, 656);
    scheduleBlock(704 + stackGap, 728 + stackGap, 958);
    footer(1024);
    return;
  }
  const isFeed = opts.format === 'feed';
  header(isFeed ? 64 : 88, isFeed ? 150 : 208, isFeed ? 84 : 104, isFeed ? 178 : 244, isFeed ? 292 : 408, isFeed ? 330 : 458, isFeed ? 372 : 520);
  matchup(isFeed ? 566 : 900, isFeed ? 116 : 168, isFeed ? 742 : 1132, isFeed ? 774 : 1174);
  scheduleBlock((isFeed ? 818 : 1268) + stackGap, (isFeed ? 844 : 1300) + stackGap, isFeed ? 1200 : 1720);
  footer(isFeed ? 1256 : 1804);
}
