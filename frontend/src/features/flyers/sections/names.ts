/**
 * Nombre del equipo con efectos de legibilidad configurables:
 * contorno (stroke), sombra suave y glow sutil. Ajuste automático al ancho.
 */
import { DISPLAY } from '../templates/common';
import type { TypographyTuning } from '../types';

/** Luminancia aproximada de un color CSS (para auto-contraste del contorno). */
function luminanceOf(ctx: CanvasRenderingContext2D, css: string): number {
  ctx.save();
  ctx.fillStyle = '#000000';
  ctx.fillStyle = css;
  const norm = String(ctx.fillStyle);
  ctx.restore();
  const m = norm.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return 0;
  const r = Number(m[1]) / 255;
  const g = Number(m[2]) / 255;
  const b = Number(m[3]) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function paintName(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxW: number,
  base: number,
  color: string,
  align: CanvasTextAlign,
  ty: TypographyTuning,
  glowColor: string | null,
): number {
  const t = text.toUpperCase();
  let size = Math.max(14, Math.round(base));
  const set = (s: number) => {
    ctx.font = `${ty.weight} ${s}px ${DISPLAY}`;
  };
  set(size);
  while (size > 14 && ctx.measureText(t).width > maxW) {
    size -= 2;
    set(size);
  }
  // Contorno auto: negro sobre texto claro, halo claro sobre texto oscuro,
  // salvo color elegido explícitamente.
  const strokeCol =
    ty.nameStrokeColor.toLowerCase() === '#000000' && luminanceOf(ctx, color) <= 0.45
      ? 'rgba(255,255,255,0.9)'
      : ty.nameStrokeColor;
  ctx.save();
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  if (ty.nameGlow && glowColor) {
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = Math.round(size * 0.4);
  } else if (ty.nameShadow) {
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = Math.round(size * 0.18);
    ctx.shadowOffsetY = Math.round(size * 0.06);
  }
  if (ty.nameStroke) {
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.min(Math.max(2, ty.nameStrokeWidth), size * 0.22);
    ctx.strokeStyle = strokeCol;
    ctx.strokeText(t, x, y);
  }
  ctx.fillStyle = color;
  ctx.fillText(t, x, y);
  ctx.restore();
  return size;
}
