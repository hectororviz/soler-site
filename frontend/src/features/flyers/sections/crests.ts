/**
 * Tratamiento visual del escudo (configurable, sin fondo blanco por defecto).
 * - none: imagen tal cual, solo sombra suave de apoyo.
 * - ring: contorno fino, interior transparente.
 * - glow: resplandor del color acento, sin base ni marco.
 * - plate: placa minimal (el template aporta el tono, nunca blanco puro).
 * - card: tarjeta institucional (placa redondeada con filo superior).
 * - crop: recortado al contenido (sin contenedor).
 * Además: `removeWhiteBackground` vuelve transparente el fondo blanco de las
 * fotos/JPG subidos por los clubes (flood-fill desde los bordes con tolerancia).
 */
import { DISPLAY } from '../templates/common';
import type { CrestTreatment } from '../types';

export type ResolvedCrest = Exclude<CrestTreatment, 'auto'>;

export interface CrestColors {
  ring: string;
  glow: string;
  /** Tono de la placa/tarjeta minimal (el template lo define). */
  plate: string;
  plateInk: string;
}

function initials(name: string): string {
  const clean = name.replace(/^(club|deportivo|social|atlético|atletico)\s+/i, '').trim();
  return (clean.slice(0, 2) || '??').toUpperCase();
}

/**
 * Inunda desde los bordes todo píxel "casi blanco" y lo vuelve transparente.
 * Solo actúa si el marco es efectivamente claro (foto con fondo blanco);
 * si el borde ya tiene color, devuelve la imagen intacta.
 */
export function removeWhiteBackground(img: HTMLImageElement | HTMLCanvasElement, tolerance = 26): HTMLCanvasElement {
  const w = img instanceof HTMLImageElement ? img.naturalWidth : img.width;
  const h = img instanceof HTMLImageElement ? img.naturalHeight : img.height;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return canvas;
  ctx.drawImage(img, 0, 0);
  let data: ImageData;
  try {
    data = ctx.getImageData(0, 0, w, h);
  } catch {
    return canvas;
  }
  const px = data.data;
  const isWhite = (i: number) => {
    const r = px[i];
    const g = px[i + 1];
    const b = px[i + 2];
    const mx = Math.max(r, g, b);
    const mn = Math.min(r, g, b);
    return mx > 235 - tolerance && mx - mn < tolerance;
  };
  // ¿El marco es blanco? Muestrear el perímetro.
  let white = 0;
  let total = 0;
  const sample = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    total++;
    if (isWhite((y * w + x) * 4)) white++;
  };
  for (let x = 0; x < w; x += 4) {
    sample(x, 0);
    sample(x, h - 1);
  }
  for (let y = 0; y < h; y += 4) {
    sample(0, y);
    sample(w - 1, y);
  }
  if (total === 0 || white / total < 0.55) return canvas;
  // Flood-fill desde los 4 bordes sobre píxeles casi blancos.
  const visited = new Uint8Array(w * h);
  const cleared = new Uint8Array(w * h);
  const stack: number[] = [];
  for (let x = 0; x < w; x++) {
    stack.push(x, (h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    stack.push(y * w, y * w + (w - 1));
  }
  while (stack.length > 0) {
    const p = stack.pop() as number;
    if (p < 0 || p >= w * h || visited[p]) continue;
    visited[p] = 1;
    const o = p * 4;
    if (!isWhite(o) || px[o + 3] === 0) continue;
    px[o + 3] = 0;
    cleared[p] = 1;
    const x = p % w;
    if (x > 0) stack.push(p - 1);
    if (x < w - 1) stack.push(p + 1);
    stack.push(p - w, p + w);
  }
  ctx.putImageData(data, 0, 0);
  // Segunda pasada anti-halo: píxeles vecinos a la zona limpiada que sean
  // casi blancos (umbral más laxo) también se transparentan. Así se preserva
  // el blanco interior del escudo y se elimina el reborde.
  const loose = (i: number) => {
    const r = px[i];
    const g = px[i + 1];
    const b = px[i + 2];
    const mx = Math.max(r, g, b);
    const mn = Math.min(r, g, b);
    return mx > 215 - tolerance && mx - mn < tolerance + 14;
  };
  for (let p = 0; p < w * h; p++) {
    if (!cleared[p]) continue;
    const x = p % w;
    const y = (p - x) / w;
    const neighbors = [
      x > 0 ? p - 1 : -1,
      x < w - 1 ? p + 1 : -1,
      y > 0 ? p - w : -1,
      y < h - 1 ? p + w : -1,
    ];
    for (const q of neighbors) {
      if (q < 0 || cleared[q]) continue;
      const o = q * 4;
      if (px[o + 3] !== 0 && loose(o)) {
        px[o + 3] = 0;
        cleared[q] = 1;
      }
    }
  }
  ctx.putImageData(data, 0, 0);
  return canvas;
}

/** Recorta márgenes transparentes (o blancos) alrededor del contenido. */
export function trimMargins(source: HTMLImageElement | HTMLCanvasElement): HTMLCanvasElement {
  const w = source instanceof HTMLImageElement ? source.naturalWidth : source.width;
  const h = source instanceof HTMLImageElement ? source.naturalHeight : source.height;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, w);
  canvas.height = Math.max(1, h);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return canvas;
  ctx.drawImage(source, 0, 0);
  let data: ImageData;
  try {
    data = ctx.getImageData(0, 0, w, h);
  } catch {
    return canvas;
  }
  const px = data.data;
  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const o = (y * w + x) * 4;
      const alpha = px[o + 3];
      const r = px[o];
      const g = px[o + 1];
      const b = px[o + 2];
      const solid = alpha > 24 && !(r > 238 && g > 238 && b > 238);
      if (solid) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return canvas;
  const pad = Math.round(Math.max(w, h) * 0.04);
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(w - 1, maxX + pad);
  maxY = Math.min(h - 1, maxY + pad);
  const out = document.createElement('canvas');
  out.width = Math.max(1, maxX - minX + 1);
  out.height = Math.max(1, maxY - minY + 1);
  const octx = out.getContext('2d');
  if (!octx) return canvas;
  octx.drawImage(canvas, minX, minY, out.width, out.height, 0, 0, out.width, out.height);
  return out;
}

export function paintCrest(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | HTMLCanvasElement | null,
  cx: number,
  cy: number,
  radius: number,
  name: string,
  treatment: ResolvedCrest,
  colors: CrestColors,
  glowStrength = 0.55,
) {
  const iw = img instanceof HTMLImageElement ? img.naturalWidth : (img?.width ?? 0);
  const ih = img instanceof HTMLImageElement ? img.naturalHeight : (img?.height ?? 0);
  const usable = !!img && iw > 0 && ih > 0;
  const drawImage = (padRatio: number) => {
    if (!usable) return false;
    try {
      const image = img as HTMLImageElement | HTMLCanvasElement;
      const pad = radius * padRatio;
      const box = (radius - pad) * 2;
      const scale = Math.min(box / iw, box / ih);
      const dw = iw * scale;
      const dh = ih * scale;
      ctx.drawImage(image, cx - dw / 2, cy - dh / 2, dw, dh);
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
  // Escudo faltante: disco en tono placa de la plantilla + iniciales.
  // Nunca pleno de color ni letras gigantes.
  const drawMissing = () => {
    ctx.save();
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = colors.plate;
    ctx.fill();
    ctx.globalAlpha = treatment === 'plate' ? 0.5 : 0.7;
    ctx.lineWidth = Math.max(2, radius * 0.035);
    ctx.strokeStyle = colors.ring;
    ctx.stroke();
    ctx.restore();
    drawInitials(colors.plateInk, 0.5);
  };

  if (treatment === 'glow' && usable) {
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
  if (treatment === 'plate' || treatment === 'card') {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = radius * 0.3;
    ctx.shadowOffsetY = radius * 0.06;
    if (treatment === 'plate') {
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = colors.plate;
      ctx.fill();
    } else {
      const s = radius * 2.06;
      const r = radius * 0.42;
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') ctx.roundRect(cx - s / 2, cy - s / 2, s, s, r);
      else ctx.rect(cx - s / 2, cy - s / 2, s, s);
      ctx.fillStyle = colors.plate;
      ctx.fill();
      // Filo institucional superior
      ctx.save();
      ctx.clip();
      ctx.fillStyle = colors.ring;
      ctx.globalAlpha = 0.9;
      ctx.fillRect(cx - s / 2, cy - s / 2, s, Math.max(6, radius * 0.12));
      ctx.restore();
    }
    ctx.restore();
  }
  if (treatment === 'original') {
    // Sin modificaciones: imagen cruda tal cual (respeta su alfa si lo trae).
    if (!drawImage(0)) drawMissing();
    return;
  }
  if (treatment === 'none' || treatment === 'crop') {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = radius * 0.25;
    ctx.shadowOffsetY = radius * 0.04;
    if (!drawImage(0.12)) drawMissing();
    ctx.restore();
    return;
  }

  ctx.save();
  if (treatment === 'plate') {
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.clip();
  }
  if (treatment === 'card') {
    const s = radius * 2.06;
    const r = radius * 0.42;
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') ctx.roundRect(cx - s / 2, cy - s / 2, s, s, r);
    else ctx.rect(cx - s / 2, cy - s / 2, s, s);
    ctx.clip();
  }
  if (!drawImage(treatment === 'plate' || treatment === 'card' ? 0.34 : 0.16)) {
    drawMissing();
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
