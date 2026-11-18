/**
 * Carga de imágenes para el motor de flyers.
 * - Escudos: se respeta la proporción original (contain, sin deformar).
 * - Caché en memoria por URL para que la vista previa sea instantánea.
 * - Todo fallo (404, CORS, SVG sin tamaño) resuelve null y la plantilla
 *   dibuja iniciales como respaldo, nunca rompe el render.
 */

const cache = new Map<string, Promise<HTMLImageElement | null>>();

export function loadImageCached(src: string): Promise<HTMLImageElement | null> {
  let pending = cache.get(src);
  if (!pending) {
    pending = new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      const timer = setTimeout(() => resolve(null), 9000);
      img.onload = () => {
        clearTimeout(timer);
        resolve(img.naturalWidth > 0 && img.naturalHeight > 0 ? img : null);
      };
      img.onerror = () => {
        clearTimeout(timer);
        resolve(null);
      };
      img.src = src;
    });
    cache.set(src, pending);
  }
  return pending;
}

export function clearImageCache() {
  cache.clear();
}

export async function waitForFonts(): Promise<void> {
  try {
    await (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts?.ready;
  } catch {
    /* fuentes del sistema como respaldo */
  }
}
