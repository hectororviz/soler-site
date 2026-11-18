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
  spaced,
  unspaced,
  vignette,
  withBlock,
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
  home: HTMLImageElement | HTMLCanvasElement | null;
  away: HTMLImageElement | HTMLCanvasElement | null;
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
  let hidden = 0;
  const { w, h } = FORMATS[opts.format];
  const p = { ...MATCHDAY_PRO_DEFAULTS, ...palette };
  const show = opts.show;
  const cx = w / 2;
  const ty0 = opts.typography;
  const left = opts.composition === 'asymmetric' || ty0.align === 'left';
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
    const py = pillY + lay.dateDy;
    const dy = dayY + lay.dateDy;
    const sy = subY + lay.dateDy;
    ctx.textAlign = left ? 'left' : 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = `600 ${opts.format === 'square' ? 25 : 29}px ${SANS}`;
    if (ty.tracking > 0) spaced(ctx, ty.tracking);
    ctx.fillText('CLUB SOCIAL Y DEPORTIVO SOLER', tx, eyebrowY);
    unspaced(ctx);
    if (show.tournament) {
      if (left) {
        let s = Math.round(titleBase * cs * ty.title);
        ctx.font = `${WT} ${s}px ${DISPLAY}`;
        while (s > 20 && ctx.measureText(content.tournamentName.toUpperCase()).width > w - 220) {
          s -= 2;
          ctx.font = `${WT} ${s}px ${DISPLAY}`;
        }
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'left';
        ctx.fillText(content.tournamentName.toUpperCase(), tx, titleY);
      } else {
        fitCenter(ctx, content.tournamentName.toUpperCase(), cx, titleY, w - 140, Math.round(titleBase * cs * ty.title), DISPLAY, WT, '#ffffff');
      }
    }
    if (show.round) {
      const t = content.roundLabel.toUpperCase();
      ctx.font = `${WT} ${Math.round(titleBase * 0.48 * ty.dateNum)}px ${DISPLAY}`;
      const pw = Math.min(w - 220, ctx.measureText(t).width + 100);
      const ph = Math.round(titleBase * 0.78);
      const px = left ? tx : cx - pw / 2;
      ctx.save();
      ctx.shadowColor = p.primary;
      ctx.shadowBlur = opts.intensity === 'low' ? 0 : 24;
      ctx.fillStyle = p.primary;
      ctx.beginPath();
      ctx.roundRect(px, py, pw, ph, ph / 2);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.fillText(t, left ? px + pw / 2 : cx, py + ph * 0.7);
    }
    if (show.day) {
      ctx.textAlign = left ? 'left' : 'center';
      if (opts.dateStyle === 'short') {
        ctx.fillStyle = p.accent;
        ctx.font = `${WT} ${Math.round(titleBase * 0.56 * ty.dateText)}px ${DISPLAY}`;
        ctx.fillText(content.daySubtitle, tx, dy);
      } else if (left) {
        let s = Math.round(titleBase * 0.56 * ty.dateText);
        ctx.font = `${WT} ${s}px ${DISPLAY}`;
        while (s > 20 && ctx.measureText(content.dayTitle).width > w - 220) {
          s -= 2;
          ctx.font = `${WT} ${s}px ${DISPLAY}`;
        }
        ctx.fillStyle = p.accent;
        ctx.textAlign = 'left';
        ctx.fillText(content.dayTitle, tx, dy);
        if (opts.dateStyle === 'both') {
          ctx.fillStyle = 'rgba(255,255,255,0.88)';
          ctx.font = `500 ${Math.round(titleBase * 0.3)}px ${SANS}`;
          ctx.fillText(content.daySubtitle, tx, sy);
        }
      } else {
        const anchor = left ? tx + (w - 220) / 2 : cx;
        fitCenter(ctx, content.dayTitle, anchor, dy, w - 150, Math.round(titleBase * 0.56 * ty.dateText), DISPLAY, WT, p.accent);
        if (opts.dateStyle === 'both') {
          ctx.fillStyle = 'rgba(255,255,255,0.88)';
          ctx.font = `500 ${Math.round(titleBase * 0.3)}px ${SANS}`;
          ctx.fillText(content.daySubtitle, tx, sy);
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
    paintCrest(ctx, assets.home, lx - lay.crestGap / 2, crestY, Math.round(rA * lay.crestHome), content.homeName, treat, colors, opts.intensity === 'high' ? 0.75 : 0.5);
    paintCrest(ctx, assets.away, rx + lay.crestGap / 2, yB, Math.round(rB * lay.crestAway), content.awayName, treat, colors, opts.intensity === 'high' ? 0.65 : 0.45);
    vsHero(ctx, cx, Math.round((crestY + yB) / 2), Math.round(crestR * (impact ? 0.52 : 0.48) * lay.vsScale), p, opts.intensity);
    if (asym) {
      ctx.textAlign = 'left';
      let s1 = Math.round(crestR * 0.34 * ty.names);
      ctx.font = `${WT} ${s1}px ${DISPLAY}`;
      while (s1 > 18 && ctx.measureText(content.homeName.toUpperCase()).width > w - 220) {
        s1 -= 2;
        ctx.font = `${WT} ${s1}px ${DISPLAY}`;
      }
      ctx.fillStyle = '#fff';
      ctx.fillText(content.homeName.toUpperCase(), tx, nameY);
      ctx.fillStyle = p.accent;
      ctx.font = `700 ${Math.round(crestR * 0.19)}px ${SANS}`;
      ctx.fillText('LOCAL', tx, nameY + 34);
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      let s2 = Math.round(crestR * 0.28 * ty.names);
      ctx.font = `${WT} ${s2}px ${DISPLAY}`;
      while (s2 > 16 && ctx.measureText(content.awayName.toUpperCase()).width > w - 220) {
        s2 -= 2;
        ctx.font = `${WT} ${s2}px ${DISPLAY}`;
      }
      ctx.fillText(content.awayName.toUpperCase(), tx, nameY + 34 + 56);
      if (show.homeAway) {
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.font = `700 ${Math.round(crestR * 0.19)}px ${SANS}`;
        ctx.fillText('VISITANTE', tx, nameY + 34 + 56 + 30);
      }
    } else {
      fitCenter(ctx, content.homeName.toUpperCase(), lx, nameY, 400, Math.round(crestR * 0.34 * ty.names), DISPLAY, WT, '#ffffff');
      fitCenter(ctx, content.awayName.toUpperCase(), rx, nameY, 400, Math.round(crestR * 0.34 * ty.names), DISPLAY, WT, '#ffffff');
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
  const lay = opts.layout;
  const ty = opts.typography;
  const WT = ty.weight;
  const dens = opts.density;
  const spread = dens === 'compact' ? -16 : dens === 'airy' ? 16 : 0;
  const schedMin = Math.round(58 * (dens === 'compact' ? 0.88 : dens === 'airy' ? 1.08 : 1));
  const scheduleTune = () => ({
    cols: lay.scheduleCols,
    rowScale: lay.rowScale,
    catScale: ty.category,
    timeScale: ty.time,
  });

  const scheduleBlock = (titleY: number, gridY: number, gridEnd: number) => {
    ctx.textAlign = left ? 'left' : 'center';
    if (ty.tracking > 0) spaced(ctx, ty.tracking);
    ctx.fillStyle = p.accent;
    ctx.font = `800 42px ${DISPLAY}`;
    const hw = ctx.measureText('HORARIOS').width;
    unspaced(ctx);
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
    return paintSchedule(ctx, opts.schedule, left ? tx : 90, gridY, left ? w - tx - 70 : w - 180, gridEnd - gridY, content.rows, scheduleStyle(p), false, schedMin, scheduleTune());
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
    withBlock(ctx, cx, 200, lay.headerScale, lay.headerDx, lay.headerDy - lay.separation - spread / 2, () => header(58, 130, 70, 158, 278, 312, 352));
    withBlock(ctx, cx, 492, lay.matchupScale, lay.matchupDx, lay.matchupDy, () => matchup(492, Math.round(96 * lay.crestScale), 626, 656));
    withBlock(ctx, cx, 843, lay.scheduleScale, 0, lay.scheduleDy + lay.separation + spread, () => { hidden = scheduleBlock(704 + stackGap, 728 + stackGap, 958).hidden; });
    withBlock(ctx, cx, 1030, lay.footerScale, 0, lay.footerDy, () => footer(1024));
    return { hidden };
  }
  const isFeed = opts.format === 'feed';
  const crR = Math.round((isFeed ? 116 : 178) * lay.crestScale);
  withBlock(ctx, cx, isFeed ? 235 : 300, lay.headerScale, lay.headerDx, lay.headerDy - lay.separation - spread / 2, () =>
    header(isFeed ? 64 : 88, isFeed ? 150 : 208, isFeed ? 84 : 104, isFeed ? 178 : 244, isFeed ? 292 : 408, isFeed ? 330 : 458, isFeed ? 372 : 520));
  withBlock(ctx, cx, isFeed ? 566 : 900, lay.matchupScale, lay.matchupDx, lay.matchupDy, () =>
    matchup(isFeed ? 566 : 890, crR, isFeed ? 742 : 1120, isFeed ? 774 : 1162));
  withBlock(ctx, cx, isFeed ? 1022 : 1510, lay.scheduleScale, 0, lay.scheduleDy + lay.separation + spread, () =>
    { hidden = scheduleBlock((isFeed ? 818 : 1230) + stackGap, (isFeed ? 844 : 1258) + stackGap, isFeed ? 1200 : 1720).hidden; });
  withBlock(ctx, cx, isFeed ? 1280 : 1820, lay.footerScale, 0, lay.footerDy, () => footer(isFeed ? 1256 : 1804));
  return { hidden };
}
