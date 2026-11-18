/**
 * Orquestador del motor: carga escudos + fondo, delega en la plantilla
 * y devuelve el canvas listo para vista previa o exportación PNG.
 */
import { FORMATS, type FlyerContent, type FlyerOptions, type Palette } from './types';
import { loadImageCached, waitForFonts } from './assets';
import { MATCHDAY_PRO_DEFAULTS, renderMatchdayPro } from './templates/matchdayPro';
import { MINIMAL_PREMIUM_DEFAULTS, renderMinimalPremium } from './templates/minimalPremium';
import { SOCIAL_BOLD_DEFAULTS, renderSocialBold } from './templates/socialBold';

export interface ResolvedAssets {
  home: HTMLImageElement | null;
  away: HTMLImageElement | null;
  bg: HTMLImageElement | null;
}

const TEMPLATE_DEFAULTS: Record<FlyerOptions['template'], Palette> = {
  'editorial-clean': MINIMAL_PREMIUM_DEFAULTS,
  'matchday-stadium': MATCHDAY_PRO_DEFAULTS,
  'social-bold': SOCIAL_BOLD_DEFAULTS,
};

export function resolvePalette(opts: FlyerOptions): Palette {
  return { ...TEMPLATE_DEFAULTS[opts.template], ...opts.palette };
}

export async function loadAssets(content: FlyerContent, opts: FlyerOptions): Promise<ResolvedAssets> {
  const [home, away, bg] = await Promise.all([
    content.homeCrest ? loadImageCached(content.homeCrest) : Promise.resolve(null),
    content.awayCrest ? loadImageCached(content.awayCrest) : Promise.resolve(null),
    opts.customBg ? loadImageCached(opts.customBg) : Promise.resolve(null),
  ]);
  return { home, away, bg };
}

export async function renderFlyerCanvas(content: FlyerContent, opts: FlyerOptions): Promise<HTMLCanvasElement> {
  await waitForFonts();
  const { w, h } = FORMATS[opts.format];
  const assets = await loadAssets(content, opts);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas no disponible.');
  const palette = resolvePalette(opts);
  switch (opts.template) {
    case 'matchday-stadium':
      renderMatchdayPro(ctx, content, opts, palette, assets);
      break;
    case 'editorial-clean':
      renderMinimalPremium(ctx, content, opts, palette, assets);
      break;
    case 'social-bold':
      renderSocialBold(ctx, content, opts, palette, assets);
      break;
  }
  return canvas;
}

export async function exportFlyerPng(content: FlyerContent, opts: FlyerOptions): Promise<Blob> {
  const canvas = await renderFlyerCanvas(content, opts);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
  if (!blob) throw new Error('No se pudo generar la imagen.');
  return blob;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
