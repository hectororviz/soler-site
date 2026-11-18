/**
 * Social Bold: impacto para stories y difusión rápida. Partido protagonista,
 * jerarquía clara, ruido controlado (las diagonales enmarcan, no invaden).
 */
import type { FlyerContent, FlyerOptions, FormatId, Palette } from '../types';
import { FORMATS } from '../types';
import {
  DISPLAY,
  SANS,
  drawPin,
  fitCenter,
  grain,
  skewedAt,
  vignette,
} from './common';
import { paintCrest } from '../sections/crests';
import { paintSchedule, type ScheduleStyle } from '../sections/schedule';

export const SOCIAL_BOLD_DEFAULTS: Palette = {
  primary: '#E02636',
  accent: '#FFC93C',
  bg: '#101014',
  ink: '#FFFFFF',
};

export interface BoldAssets {
  home: HTMLImageElement | null;
  away: HTMLImageElement | null;
  bg: HTMLImageElement | null;
}

interface Layout {
  cx: number;
  align: 'center' | 'left';
  crestR: number;
  crestY: number;
  crestLX: number;
  crestRX: number;
  awayR: number;
  awayY: number;
  nameY: number;
  tagY: number;
  titleBase: number;
  nameBase: number;
}

function layoutFor(format: FormatId, composition: FlyerOptions['composition']): Layout {
  const base: Record<FormatId, Layout> = {
    story: { cx: 540, align: 'center', crestR: 168, crestY: 900, crestLX: 300, crestRX: 780, awayR: 168, awayY: 900, nameY: 1132, tagY: 1174, titleBase: 104, nameBase: 56 },
    feed: { cx: 540, align: 'center', crestR: 116, crestY: 566, crestLX: 272, crestRX: 808, awayR: 116, awayY: 566, nameY: 742, tagY: 774, titleBase: 84, nameBase: 46 },
    square: { cx: 540, align: 'center', crestR: 94, crestY: 488, crestLX: 295, crestRX: 785, awayR: 94, awayY: 488, nameY: 624, tagY: 654, titleBase: 70, nameBase: 42 },
  };
  const L = { ...base[format] };
  if (composition === 'compact') {
    L.crestR = Math.round(L.crestR * 0.84);
    L.awayR = Math.round(L.awayR * 0.84);
    L.titleBase = Math.round(L.titleBase * 0.92);
    L.nameBase = Math.round(L.nameBase * 0.92);
  } else if (composition === 'impact') {
    L.crestR = Math.round(L.crestR * 1.18);
    L.awayR = Math.round(L.awayR * 1.18);
    L.titleBase = Math.round(L.titleBase * 1.1);
    L.nameBase = Math.round(L.nameBase * 1.12);
  } else if (composition === 'asymmetric' && format !== 'square') {
    L.align = 'left';
    L.crestLX = Math.round(L.crestLX * 1.08);
    L.crestRX = Math.round(L.crestRX * 1.02);
    L.awayR = Math.round(L.awayR * 0.86);
    L.awayY = L.awayY + Math.round(L.crestR * 0.22);
  }
  return L;
}

function bgBold(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  p: Palette,
  assets: BoldAssets,
  intensity: FlyerOptions['intensity'],
) {
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, w, h);
  if (assets.bg) {
    try {
      ctx.save();
      ctx.globalAlpha = intensity === 'low' ? 0.16 : 0.3;
      const img = assets.bg;
      const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
      ctx.drawImage(img, (w - img.naturalWidth * scale) / 2, (h - img.naturalHeight * scale) / 2, img.naturalWidth * scale, img.naturalHeight * scale);
      ctx.restore();
    } catch {
      /* fondo procedural */
    }
  }
  // Filete superior + resplandor detrás del encabezado. Nada cruza el texto.
  ctx.fillStyle = intensity === 'low' ? 'rgba(255,255,255,0.25)' : p.accent;
  ctx.fillRect(0, 0, w, intensity === 'low' ? 6 : 10);
  const topGlow = ctx.createRadialGradient(w / 2, 0, 10, w / 2, 0, w * 0.6);
  topGlow.addColorStop(0, p.primary);
  topGlow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save();
  ctx.globalAlpha = intensity === 'low' ? 0.3 : intensity === 'high' ? 0.75 : 0.55;
  ctx.fillStyle = topGlow;
  ctx.fillRect(0, 0, w, h * 0.34);
  ctx.restore();
  if (intensity !== 'low') {
    // Resplandor detrás del duelo central + base de cancha abajo.
    const mid = ctx.createRadialGradient(w / 2, h * 0.46, 10, w / 2, h * 0.46, w * 0.55);
    mid.addColorStop(0, p.primary);
    mid.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save();
    ctx.globalAlpha = intensity === 'high' ? 0.42 : 0.26;
    ctx.fillStyle = mid;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
    const low = ctx.createRadialGradient(w / 2, h * 1.02, 10, w / 2, h * 1.02, w * 0.7);
    low.addColorStop(0, p.primary);
    low.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = low;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
  grain(ctx, w, h, intensity === 'high' ? 0.06 : intensity === 'medium' ? 0.04 : 0);
  vignette(ctx, w, h, intensity === 'low' ? 0.3 : 0.55);
}

function burst(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string, intensity: FlyerOptions['intensity']) {
  ctx.save();
  ctx.beginPath();
  const spikes = 12;
  for (let i = 0; i < spikes * 2; i++) {
    const rr = i % 2 === 0 ? r : r * 0.78;
    const a = (Math.PI * i) / spikes - Math.PI / 2;
    const px = cx + Math.cos(a) * rr;
    const py = cy + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  if (intensity !== 'low') {
    ctx.shadowColor = color;
    ctx.shadowBlur = r * 0.5;
  }
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#101016';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `800 ${Math.round(r * 0.62)}px ${DISPLAY}`;
  ctx.fillText('VS', cx, cy + r * 0.04);
}

function scheduleStyle(p: Palette): ScheduleStyle {
  return {
    rowBg: 'rgba(255,255,255,0.09)',
    rowBgAlt: 'rgba(255,255,255,0.05)',
    catColor: '#ffffff',
    timeColor: p.accent,
    timePending: 'rgba(255,255,255,0.55)',
    accent: p.accent,
    summaryBg: 'rgba(8,9,13,0.94)',
    summaryFg: p.accent,
    leaderDots: false,
    radius: 14,
  };
}

export function renderSocialBold(
  ctx: CanvasRenderingContext2D,
  content: FlyerContent,
  opts: FlyerOptions,
  palette: Palette,
  assets: BoldAssets,
) {
  const { w, h } = FORMATS[opts.format];
  const p = { ...SOCIAL_BOLD_DEFAULTS, ...palette };
  const show = opts.show;
  const L = layoutFor(opts.format, opts.composition);
  const cx = L.cx;
  const left = L.align === 'left';
  const tx = left ? 90 : cx;
  /** En cuadrado la asimétrica solo alinea header/schedule; el duelo va centrado. */
  const asym = left && opts.format !== 'square';
  const tAlign: CanvasTextAlign = left ? 'left' : 'center';
  /** En asimétrica los nombres se apilan: se baja el bloque de horarios. */
  const stackGap = asym ? 96 : 0;
  /** Sesgo itálico solo en composición centrada; la asimétrica va recta. */
  const skewIt = (anchorY: number, fn: () => void) => {
    if (left) fn();
    else skewedAt(ctx, cx, anchorY, fn);
  };

  bgBold(ctx, w, h, p, assets, opts.intensity);

  // ---- Encabezado ----
  const header = (eyebrowY: number, titleY: number, pillY: number, dayY: number) => {
    ctx.textAlign = tAlign;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = `700 ${opts.format === 'story' ? 28 : 24}px ${SANS}`;
    ctx.fillText('CLUB SOCIAL Y DEPORTIVO SOLER', left ? tx : cx, eyebrowY);
    if (show.tournament) {
      if (left) {
        let s = L.titleBase;
        ctx.font = `800 ${s}px ${DISPLAY}`;
        while (s > 20 && ctx.measureText(content.tournamentName.toUpperCase()).width > w - 180) {
          s -= 2;
          ctx.font = `800 ${s}px ${DISPLAY}`;
        }
        ctx.fillStyle = '#fff';
        ctx.fillText(content.tournamentName.toUpperCase(), tx, titleY);
      } else {
        fitCenter(ctx, content.tournamentName.toUpperCase(), cx, titleY, w - 130, L.titleBase, DISPLAY, 800, '#ffffff');
      }
    }
    if (show.round) {
      const t = content.roundLabel.toUpperCase();
      ctx.font = `800 ${L.titleBase * 0.48}px ${DISPLAY}`;
      const pw = Math.min(w - 220, ctx.measureText(t).width + 100);
      const bx = left ? tx : cx - pw / 2;
      ctx.save();
      ctx.fillStyle = p.primary;
      ctx.beginPath();
      const hh = L.titleBase * 0.76;
      const skewPad = hh * 0.35;
      ctx.moveTo(bx + skewPad, pillY);
      ctx.lineTo(bx + pw, pillY);
      ctx.lineTo(bx + pw - skewPad, pillY + hh);
      ctx.lineTo(bx, pillY + hh);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.fillText(t, (left ? bx + pw / 2 : cx), pillY + hh * 0.7);
      ctx.restore();
      ctx.textAlign = tAlign;
    }
    if (show.day) {
      const drawDay = () => {
        ctx.textAlign = tAlign;
        if (opts.dateStyle === 'short') {
          ctx.fillStyle = p.accent;
          ctx.font = `800 ${Math.round(L.titleBase * 0.58)}px ${DISPLAY}`;
          ctx.fillText(content.daySubtitle, left ? tx : cx, dayY);
        } else if (left) {
          let s = Math.round(L.titleBase * 0.56);
          ctx.font = `800 ${s}px ${DISPLAY}`;
          while (s > 20 && ctx.measureText(content.dayTitle).width > w - 180) {
            s -= 2;
            ctx.font = `800 ${s}px ${DISPLAY}`;
          }
          ctx.fillStyle = p.accent;
          ctx.textAlign = 'left';
          ctx.fillText(content.dayTitle, tx, dayY);
          if (opts.dateStyle === 'both') {
            ctx.fillStyle = 'rgba(255,255,255,0.88)';
            ctx.font = `500 ${Math.round(L.titleBase * 0.3)}px ${SANS}`;
            ctx.fillText(content.daySubtitle, tx, dayY + Math.round(L.titleBase * 0.36));
          }
        } else {
          fitCenter(ctx, content.dayTitle, cx, dayY, w - 140, Math.round(L.titleBase * 0.56), DISPLAY, 800, p.accent);
          if (opts.dateStyle === 'both') {
            ctx.fillStyle = 'rgba(255,255,255,0.88)';
            ctx.font = `500 ${Math.round(L.titleBase * 0.3)}px ${SANS}`;
            ctx.textAlign = 'center';
            ctx.fillText(content.daySubtitle, cx, dayY + Math.round(L.titleBase * 0.36));
          }
        }
      };
      skewIt(dayY, drawDay);
    }
  };

  // ---- Enfrentamiento ----
  const matchup = (crestScaleY: number, venueY: number | null) => {
    const treat = opts.crest === 'auto' ? 'ring' : opts.crest;    const colors = { ring: p.accent, glow: p.primary, plate: 'rgba(255,255,255,0.10)', plateInk: '#ffffff' };
    paintCrest(ctx, assets.home, L.crestLX, crestScaleY, L.crestR, content.homeName, treat, colors);
    paintCrest(ctx, assets.away, L.crestRX, L.awayY, L.awayR, content.awayName, treat, colors);
    const vsR = Math.round(L.crestR * (opts.composition === 'impact' ? 0.5 : 0.42));
    burst(ctx, cx, (crestScaleY + L.awayY) / 2, vsR, p.accent, opts.intensity);
    const drawNames = () => {
      ctx.textAlign = tAlign;
      const maxW = left ? w - 180 : 340;
      if (asym) {
        let s1 = L.nameBase;
        ctx.font = `800 ${s1}px ${DISPLAY}`;
        while (s1 > 18 && ctx.measureText(content.homeName.toUpperCase()).width > maxW) {
          s1 -= 2;
          ctx.font = `800 ${s1}px ${DISPLAY}`;
        }
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'left';
        ctx.fillText(content.homeName.toUpperCase(), tx, L.nameY);
        ctx.fillStyle = p.accent;
        ctx.font = `800 ${Math.round(L.nameBase * 0.45)}px ${SANS}`;
        ctx.fillText('LOCAL', tx, L.nameY + 34);
        let s2 = Math.round(L.nameBase * 0.8);
        ctx.font = `800 ${s2}px ${DISPLAY}`;
        while (s2 > 16 && ctx.measureText(content.awayName.toUpperCase()).width > maxW) {
          s2 -= 2;
          ctx.font = `800 ${s2}px ${DISPLAY}`;
        }
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.fillText(content.awayName.toUpperCase(), tx, L.nameY + 34 + 56);
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.font = `800 ${Math.round(L.nameBase * 0.45)}px ${SANS}`;
        ctx.fillText('VISITANTE', tx, L.nameY + 34 + 56 + 30);
      } else {
        fitCenter(ctx, content.homeName.toUpperCase(), L.crestLX, L.nameY, 340, L.nameBase, DISPLAY, 800, '#ffffff');
        fitCenter(ctx, content.awayName.toUpperCase(), L.crestRX, L.nameY, 340, L.nameBase, DISPLAY, 800, '#ffffff');
      }
    };
    skewIt(L.nameY, drawNames);
    if (show.homeAway && !asym) {
      ctx.fillStyle = p.accent;
      ctx.font = `800 ${Math.round(L.nameBase * 0.5)}px ${SANS}`;
      ctx.textAlign = 'center';
      ctx.fillText('LOCAL', L.crestLX, L.tagY);
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillText('VISITANTE', L.crestRX, L.tagY);
    }
    if (show.venue && content.venue && venueY !== null) {
      const label = content.venue.toUpperCase().slice(0, 44);
      if (left) {
        drawPin(ctx, tx + 14, venueY - 10, 26, p.accent);
        ctx.fillStyle = '#fff';
        ctx.font = `700 ${Math.round(L.titleBase * 0.32)}px ${SANS}`;
        ctx.textAlign = 'left';
        ctx.fillText(label, tx + 48, venueY);
      } else {
        ctx.font = `700 ${Math.round(L.titleBase * 0.32)}px ${SANS}`;
        const tw = Math.min(ctx.measureText(label).width, w - 200);
        drawPin(ctx, cx - tw / 2 - 30, venueY - 10, 26, p.accent);
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.fillText(label, cx + 8, venueY);
      }
    }
  };

  const scheduleBlock = (titleY: number, gridY: number, gridEnd: number) => {
    skewIt(titleY, () => {
      ctx.fillStyle = p.accent;
      ctx.font = `800 ${Math.round(L.titleBase * 0.42)}px ${DISPLAY}`;
      if (left) {
        ctx.textAlign = 'left';
        ctx.fillText('HORARIOS', tx, titleY);
        const tw = ctx.measureText('HORARIOS').width;
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.font = `700 ${Math.round(L.titleBase * 0.24)}px ${SANS}`;
        ctx.fillText(`${content.rows.length} CAT.`, tx + tw + 24, titleY - 2);
      } else {
        ctx.textAlign = 'center';
        ctx.fillText('HORARIOS', cx, titleY);
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.font = `700 ${Math.round(L.titleBase * 0.24)}px ${SANS}`;
        ctx.fillText(`${content.rows.length} CAT.`, cx + 200, titleY - 4);
      }
    });
    paintSchedule(ctx, opts.schedule, 90, gridY, w - 180, gridEnd - gridY, content.rows, scheduleStyle(p), true, 54);
  };

  const footer = (sloganY: number) => {
    ctx.textAlign = 'center';
    if (show.slogan) {
      skewedAt(ctx, cx, sloganY, () => {
        ctx.fillStyle = p.accent;
        ctx.font = `800 ${opts.format === 'square' ? 24 : 30}px ${SANS}`;
        ctx.textAlign = 'center';
        ctx.fillText('UN LUGAR PARA COMPARTIR EN FAMILIA', cx, sloganY);
      });
    }
    if (show.web) {
      ctx.fillStyle = 'rgba(255,255,255,0.65)';
      ctx.font = `500 ${opts.format === 'square' ? 23 : 28}px ${SANS}`;
      ctx.fillText('csdsoler.com.ar', cx, sloganY + (show.slogan ? 40 : 0));
    }
  };

  if (opts.format === 'square') {
    header(64, 148, 196, 316);
    matchup(505, 1000);
    scheduleBlock(700 + stackGap, 722 + stackGap, 948);
    footer(1032);
    return;
  }
  const isFeed = opts.format === 'feed';
  header(isFeed ? 70 : 88, isFeed ? 168 : 212, isFeed ? 200 : 246, isFeed ? 326 : 410);
  matchup(isFeed ? 590 : L.crestY, isFeed ? 400 : 522);
  scheduleBlock((isFeed ? 830 : 1252) + stackGap, (isFeed ? 852 : 1280) + stackGap, isFeed ? 1192 : 1712);
  footer(isFeed ? 1262 : 1804);
}
