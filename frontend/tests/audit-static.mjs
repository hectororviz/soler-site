// Auditoría estática rápida (sin navegador): H1, SEO y CLS.
// Uso: npm run audit
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'src');
const errors = [];
const ok = (cond, msg) => {
  if (!cond) errors.push(msg);
  else console.log(`ok - ${msg}`);
};

const pages = [
  'features/home/HomePage.tsx',
  'features/fixtures/FixturePage.tsx',
  'features/results/ResultsPage.tsx',
  'features/standings/StandingsPage.tsx',
  'features/competitions/CompetitionsPage.tsx',
  'features/gallery/GalleryPage.tsx',
  'features/club/ElClubPage.tsx',
  'features/contact/ContactPage.tsx',
  'pages/stubs.tsx',
];
for (const p of pages) {
  const src = readFileSync(join(root, p), 'utf8');
  ok(/as="h1"|usePageMetaHome|<h1/.test(src), `${p} tiene H1`);
  ok(/usePageMeta/.test(src), `${p} usa usePageMeta (title+desc+canonical)`);
}
// Resultado/posiciones: URL sincronizada.
for (const p of ['features/results/ResultsPage.tsx', 'features/standings/StandingsPage.tsx']) {
  const src = readFileSync(join(root, p), 'utf8');
  ok(/useSearchParams/.test(src) && /setParams/.test(src), `${p} sincroniza filtros en URL`);
}
// Drawer: trampa de foco + retorno.
{
  const src = readFileSync(join(root, 'components/layout/Header.tsx'), 'utf8');
  ok(/openRef/.test(src) && /panelRef/.test(src), 'Header guarda refs para trampa de foco');
  ok(/Tab/.test(src) && /Escape/.test(src), 'Header maneja Tab (trap) y Escape');
}
// CLS: img con width/height.
{
  const walk = (dir) => {
    const out = [];
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) out.push(...walk(p));
      else if (e.name.endsWith('.tsx')) out.push(p);
    }
    return out;
  };
  const noDims = [];
  for (const f of walk(root)) {
    const src = readFileSync(f, 'utf8');
    const imgs = [...src.matchAll(/<img[^>]*>/g)];
    for (const m of imgs) {
      if (!/width=/.test(m[0]) || !/height=/.test(m[0])) noDims.push(`${f.split('src/')[1]}: ${m[0].slice(0, 80)}`);
    }
  }
  ok(noDims.length === 0, noDims.length === 0 ? 'todas las <img> tienen width+height' : `img sin dims:\n${noDims.join('\n')}`);
}
// Base SEO.
{
  const html = readFileSync(join(root, '..', 'index.html'), 'utf8');
  for (const s of ['og:title', 'og:description', 'og:url', 'og:image', 'canonical', 'robots', 'theme-color', 'twitter:card']) {
    ok(html.includes(s), `index.html incluye ${s}`);
  }
  ok(existsSync(join(root, '..', 'public', 'robots.txt')), 'public/robots.txt existe');
  ok(existsSync(join(root, '..', 'public', 'sitemap.xml')), 'public/sitemap.xml existe');
}
// Router con code-splitting.
{
  const src = readFileSync(join(root, 'app', 'router.tsx'), 'utf8');
  ok(/lazy\(/.test(src) && /Suspense/.test(src), 'router usa lazy+Suspense (code-splitting)');
}

if (errors.length) {
  console.error(`\nFAIL (${errors.length}):\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
console.log('\naudit: todo OK');
