/**
 * Orquestador del motor: carga escudos + fondo, delega en la plantilla
 * y devuelve el canvas listo para vista previa o exportación PNG.
 */
import { FORMATS, resolveCrest, type FlyerContent, type FlyerOptions, type Palette } from './types';
import { loadImageCached, waitForFonts } from './assets';
import { removeWhiteBackground, trimMargins } from './sections/crests';
import { MATCHDAY_PRO_DEFAULTS, renderMatchdayPro } from './templates/matchdayPro';
import { MINIMAL_PREMIUM_DEFAULTS, renderMinimalPremium } from './templates/minimalPremium';
import { SOCIAL_BOLD_DEFAULTS, renderSocialBold } from './templates/socialBold';

export interface ResolvedAssets {
  home: HTMLImageElement | HTMLCanvasElement | null;
  away: HTMLImageElement | HTMLCanvasElement | null;
  bg: HTMLImageElement | null;
}

const processedCache = new Map<string, Promise<HTMLImageElement | HTMLCanvasElement | null>>();

/** Escudo procesado: quita-fondo blanco opcional + recorte opcional, con caché. */
export function loadProcessedCrest(src: string, removeWhite: boolean, tol: number, crop: boolean): Promise<HTMLImageElement | HTMLCanvasElement | null> {
  const key = `${src}|w${removeWhite ? tol : 0}|c${crop ? 1 : 0}`;
  let pending = processedCache.get(key);
  if (!pending) {
    pending = (async () => {
      const img = await loadImageCached(src);
      if (!img) return null;
      let out: HTMLImageElement | HTMLCanvasElement = img;
      try {
        if (removeWhite) out = removeWhiteBackground(out, tol);
        if (crop) out = trimMargins(out);
      } catch {
        return img;
      }
      return out;
    })();
    processedCache.set(key, pending);
  }
  return pending;
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
  const crop = resolveCrest(opts) === 'crop';
  const [home, away, bg] = await Promise.all([
    content.homeCrest ? loadProcessedCrest(content.homeCrest, opts.removeWhite, opts.removeWhiteTol, crop) : Promise.resolve(null),
    content.awayCrest ? loadProcessedCrest(content.awayCrest, opts.removeWhite, opts.removeWhiteTol, crop) : Promise.resolve(null),
    opts.customBg ? loadImageCached(opts.customBg) : Promise.resolve(null),
  ]);
  return { home, away, bg };
}

export interface RenderReport {
  canvas: HTMLCanvasElement;
  /** Categorías resumidas con "+N" (0 = se muestran todas). */
  hidden: number;
}

export async function renderFlyerDetailed(content: FlyerContent, opts: FlyerOptions): Promise<RenderReport> {
  await waitForFonts();
  const { w, h } = FORMATS[opts.format];
  const assets = await loadAssets(content, opts);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas no disponible.');
  const palette = resolvePalette(opts);
  let hidden = 0;
  switch (opts.template) {
    case 'matchday-stadium':
      hidden = renderMatchdayPro(ctx, content, opts, palette, assets).hidden;
      break;
    case 'editorial-clean':
      hidden = renderMinimalPremium(ctx, content, opts, palette, assets).hidden;
      break;
    case 'social-bold':
      hidden = renderSocialBold(ctx, content, opts, palette, assets).hidden;
      break;
  }
  return { canvas, hidden };
}

export async function renderFlyerCanvas(content: FlyerContent, opts: FlyerOptions): Promise<HTMLCanvasElement> {
  return (await renderFlyerDetailed(content, opts)).canvas;
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
