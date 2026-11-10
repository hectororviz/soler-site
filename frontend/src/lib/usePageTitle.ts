import { useEffect } from 'react';

/** Título de página sin violar reglas de render (oxlint react/immutability). */
export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = title;
  }, [title]);
}

const SITE_URL = 'https://csdsoler.com.ar';
const DEFAULT_IMAGE = `${SITE_URL}/hero.jpg`;

function upsertMeta(selector: string, create: () => HTMLElement) {
  let el = document.head.querySelector(selector) as HTMLElement | null;
  if (!el) {
    el = create();
    document.head.appendChild(el);
  }
  return el;
}

/**
 * SEO por página: título + descripción + OG/Twitter + canónica.
 * - `path`: ruta canónica (ej. `/fixture`). Se genera `https://csdsoler.com.ar/fixture`.
 * - `robots`: para admin/404 usar `noindex,nofollow`; público usa `index,follow`.
 * - `image`: OG absoluta. Por defecto `/hero.jpg`.
 */
export function usePageMeta(opts: {
  title: string;
  description: string;
  path?: string;
  image?: string;
  robots?: string;
}) {
  const { title, description, path = '/', robots = 'index,follow', image = DEFAULT_IMAGE } = opts;
  useEffect(() => {
    document.title = title;
    const url = `${SITE_URL}${path}`;

    const desc = upsertMeta('meta[name="description"]', () => {
      const m = document.createElement('meta');
      m.setAttribute('name', 'description');
      return m;
    }) as HTMLMetaElement;
    desc.content = description;

    const setProp = (property: string, content: string) => {
      const el = upsertMeta(`meta[property="${property}"]`, () => {
        const m = document.createElement('meta');
        m.setAttribute('property', property);
        return m;
      }) as HTMLMetaElement;
      el.content = content;
    };
    setProp('og:title', title);
    setProp('og:description', description);
    setProp('og:url', url);
    setProp('og:image', image);

    const setName = (name: string, content: string) => {
      const el = upsertMeta(`meta[name="${name}"]`, () => {
        const m = document.createElement('meta');
        m.setAttribute('name', name);
        return m;
      }) as HTMLMetaElement;
      el.content = content;
    };
    setName('twitter:card', 'summary_large_image');
    setName('twitter:title', title);
    setName('twitter:description', description);
    setName('robots', robots);

    let link = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      document.head.appendChild(link);
    }
    link.href = url;
  }, [title, description, path, image, robots]);
}
