/**
 * Seed inicial: temporadas, torneos, categorías (spec §2.1) + clubes del CSV
 * municipal con sus escudos. NO crea fechas ni resultados: el fixture lo
 * carga el administrador y los marcadores vienen de Ligas Deportivas.
 */
import { PrismaClient } from '@prisma/client';
import { readFileSync, existsSync, mkdirSync, copyFileSync, readdirSync } from 'fs';
import { join, extname } from 'path';

const prisma = new PrismaClient();
function resolveAssets(): string {
  const candidates = [
    join(__dirname, 'seed-assets', 'crests'), // tsx dev: prisma/seed.ts
    join(__dirname, '..', 'prisma', 'seed-assets', 'crests'), // prod: dist-seed/seed.js
  ];
  for (const c of candidates) if (existsSync(c)) return c;
  throw new Error(`Assets no encontrados: ${candidates.join(' | ')}`);
}
const ASSETS = resolveAssets();
const FILES_DIR = process.env.FILES_DIR ?? './uploads';

function slugify(input: string): string {
  return input.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

interface CsvRow { id: string; name: string; short: string; slug: string; }

function parseCsv(path: string): CsvRow[] {
  const lines = readFileSync(path, 'utf8').split('\n').slice(1);
  return lines.map((l) => l.split(',')).filter((c) => c[1]?.trim()).map((c) => ({
    id: c[0].trim(), name: c[1].trim(), short: c[3].trim() || c[1].trim(), slug: c[4].trim() || slugify(c[1]),
  }));
}

async function main() {
  const season = await prisma.season.upsert({
    where: { label: '2026' }, create: { label: '2026' }, update: {},
  });

  const tournaments: Record<string, string[]> = {
    'futbol-femenino': ['Fútbol Femenino', 'Sub 9', 'Sub 11', 'Sub 13', 'Sub 15', 'Sub 17', 'Primera', 'Damas'],
    'juveniles-sabados': ['Juveniles Sábados', '2012', '2013', '2014', '2015', '2016', '2017', '2018', '2019', '2020'],
    'juveniles-domingos': ['Juveniles Domingos', '2011', '2012', '2013', '2014', '2015', '2016', '2017', '2018', '2019', '2020'],
  };
  for (const [slug, [name, ...cats]] of Object.entries(tournaments)) {
    const t = await prisma.tournament.upsert({
      where: { slug }, create: { slug, name, seasonId: season.id }, update: {},
    });
    let order = 0;
    for (const cat of cats) {
      await prisma.category.upsert({
        where: { tournamentId_slug: { tournamentId: t.id, slug: slugify(cat) } },
        create: { tournamentId: t.id, name: cat, slug: slugify(cat), order: order++ },
        update: {},
      });
    }
  }

  // Clubes + escudos
  const crestDir = join(FILES_DIR, 'crests');
  if (!existsSync(crestDir)) mkdirSync(crestDir, { recursive: true });
  const files = readdirSync(ASSETS).filter((f) => !/csv|xlsx/i.test(f));
  const byBase = new Map(files.map((f) => [f.replace(extname(f), '').toLowerCase(), f]));

  const csvPath = join(ASSETS, 'clubes-datos-a-completar.csv');
  const rows = parseCsv(csvPath);
  // Soler usa el escudo oficial SVG
  for (const row of rows) {
    let crestPath: string | undefined;
    const base = (byBase.get(row.slug.toLowerCase()) ?? byBase.get(slugify(row.name))) ;
    const file = base ?? (row.slug === 'csdsoler' ? 'csdsoler.svg' : undefined);
    if (file && existsSync(join(ASSETS, file))) {
      const dest = `${row.slug}${extname(file)}`;
      copyFileSync(join(ASSETS, file), join(crestDir, dest));
      crestPath = `/files/crests/${dest}`;
    }
    await prisma.club.upsert({
      where: { slug: row.slug },
      create: { slug: row.slug, name: row.name, shortName: row.short, externalId: row.id, crestPath },
      update: { name: row.name, shortName: row.short, externalId: row.id, ...(crestPath ? { crestPath } : {}) },
    });
  }
  // Clubes con escudo pero sin fila en CSV
  const csvSlugs = new Set(rows.map((r) => r.slug.toLowerCase()));
  for (const file of files) {
    const base = file.replace(extname(file), '').toLowerCase();
    if (csvSlugs.has(base)) continue;
    const name = base.split('-').map((w) => w[0]?.toUpperCase() + w.slice(1)).join(' ');
    copyFileSync(join(ASSETS, file), join(crestDir, file));
    await prisma.club.upsert({
      where: { slug: base },
      create: { slug: base, name, shortName: name, crestPath: `/files/crests/${file}` },
      update: {},
    });
  }

  // Soler participa en los 3 torneos (todas las categorías)
  const soler = await prisma.club.findUnique({ where: { slug: 'csdsoler' } });
  if (soler) {
    const all = await prisma.tournament.findMany({ select: { id: true } });
    for (const t of all) {
      await prisma.tournamentParticipant.upsert({
        where: { tournamentId_clubId: { tournamentId: t.id, clubId: soler.id } },
        create: { tournamentId: t.id, clubId: soler.id, categoryIds: [] },
        update: {},
      });
    }
  }

  console.log('Seed OK');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
