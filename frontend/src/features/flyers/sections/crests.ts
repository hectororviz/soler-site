/**
 * Tratamiento visual del escudo (configurable, sin fondo blanco por defecto).
 * - none: imagen tal cual, solo sombra suave de apoyo.
 * - ring: contorno fino, interior transparente.
 * - glow: resplandor del color acento, sin base ni marco.
 * - plate: placa minimal (plantilla aporta el tono, nunca blanco puro).
 */
import { DISPLAY } from '../templates/common';
import type { CrestTreatment } from '../types';

export type ResolvedCrest = Exclude<CrestTreatment, 'auto'>;

export interface CrestColors {
  ring: string;
  glow: string;
  /** Tono de la placa minimal (el template lo define: claro u oscuro). */
  plate: string;
  plateInk: string;
}

function initials(name: string): string {
  const clean = name.replace(/^(club|deportivo|social|atlético|atletico)\s+/i, '').trim();
  return (clean.slice(0, 2) || '??').toUpperCase();
}

export function paintCrest(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | null,
  cx: number,
  cy: number,
  radius: number,
  name: string,
  treatment: ResolvedCrest,
  colors: CrestColors,
  glowStrength = 0.55,
) {
  const usable = !!img && img.naturalWidth > 0 && img.naturalHeight > 0;
  const drawImage = (padRatio: number) => {
    if (!usable) return false;
    try {
      const image = img as HTMLImageElement;
      const pad = radius * padRatio;
      const box = (radius - pad) * 2;
      const scale = Math.min(box / image.naturalWidth, box / image.naturalHeight);
      const w = image.naturalWidth * scale;
      const h = image.naturalHeight * scale;
      ctx.drawImage(image, cx - w / 2, cy - h / 2, w, h);
      return true;
    } catch {
      return false;
    }
  };
  const drawInitials = (ink: string, sizeRatio: number) => {
    ctx.fillStyle = ink;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `800 ${Math.round(radius * sizeRatio)}px ${DISPLAY}`;
    ctx.fillText(initials(name), cx, cy + radius * 0.05);
  };

  if (treatment === 'glow') {
    ctx.save();
    ctx.shadowColor = colors.glow;
    ctx.shadowBlur = radius * glowStrength;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.92, 0, Math.PI * 2);
    ctx.fillStyle = colors.glow;
    ctx.fill();
    ctx.restore();
  }
  if (treatment === 'plate') {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = radius * 0.3;
    ctx.shadowOffsetY = radius * 0.06;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = colors.plate;
    ctx.fill();
    ctx.restore();
  }
  if (treatment === 'none') {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = radius * 0.25;
    ctx.shadowOffsetY = radius * 0.04;
    if (!drawImage(0.12)) {
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.10)';
      ctx.fill();
      drawInitials('rgba(255,255,255,0.75)', 0.5);
    }
    ctx.restore();
    return;
  }

  ctx.save();
  if (treatment === 'plate') {
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.clip();
  }
  if (!drawImage(treatment === 'plate' ? 0.3 : 0.16)) {
    if (treatment === 'plate') {
      drawInitials(colors.plateInk, 0.6);
    } else {
      // Escudo faltante: disco oscuro neutro + iniciales suaves (nunca pleno).
      ctx.save();
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(10,10,14,0.85)';
      ctx.fill();
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = Math.max(2, radius * 0.035);
      ctx.strokeStyle = colors.ring;
      ctx.stroke();
      ctx.restore();
      drawInitials('rgba(255,255,255,0.8)', 0.5);
    }
  }
  ctx.restore();

  if (treatment === 'ring' || treatment === 'glow') {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius * (treatment === 'glow' ? 0.98 : 1), 0, Math.PI * 2);
    ctx.lineWidth = Math.max(2.5, radius * 0.045);
    ctx.strokeStyle = colors.ring;
    ctx.stroke();
    ctx.restore();
  }
  if (treatment === 'plate') {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.lineWidth = Math.max(2, radius * 0.03);
    ctx.strokeStyle = colors.ring;
    ctx.globalAlpha = 0.5;
    ctx.stroke();
    ctx.restore();
  }
}
