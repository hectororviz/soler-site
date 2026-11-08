# CSD Soler — TODO

Registro vivo del proyecto. Marcar con `[x]` al completar. Orden = prioridad sugerida.

## Hecho

- [x] **Base frontend**: React+Vite+TS+Tailwind+shadcn-style, tokens (`--color-primary #B8202D`…),
  fuentes Barlow Condensed + Inter, layout 1280px, header responsive con drawer (Escape/foco/bloqueo scroll), footer.
- [x] **Componentes**: Button/Card/Skeleton/Empty/Error/SectionHeading + deportivos
  (ClubBadge, MatchCard, ScoreDisplay, StatusBadge, LiveIndicator, BroadcastCard, StandingsTable).
- [x] **Home completa** (§4.1): hero + vivo condicional + próximos + resultados + competiciones +
  Soler TV + institucional + galería/sponsors con estados vacíos reales.
- [x] **Identidad real**: `public/escudo.svg` oficial, `public/hero.jpg` optimizada (3MB→97KB),
  slogan "un lugar para compartir en familia", subtítulo "Club Social y Deportivo Soler".
- [x] **Backend NestJS + Prisma 6 + Postgres 16** (`/api/v1`): auth JWT single-admin (bootstrap por env),
  CRUD temporadas/torneos/categorías/clubes/escudos/participantes, fixture con reglas
  (inscripción obligatoria, anti-duplicados, generación auto por categorías, publicar),
  broadcasts con estados, content + sponsors, healthcheck, estáticos `/files/`.
- [x] **Seed real**: temporada 2026, 3 torneos + categorías (§2.1), 72 clubes del CSV con escudos, Soler inscripto.
- [x] **Fixture público funcional** contra API real: filtros torneo/categoría en URL, navegación
  de fechas, expansión por categoría, destaque Soler, compartir enlace, default al torneo con datos.
- [x] **Infra**: `Dockerfile` backend/frontend, `docker-compose.yml` local,
  `docker-compose.prod.yml` (red externa `caddy_net`, labels caddy-docker-proxy),
  CI a GHCR (`.github/workflows/ci.yml`), `docs/DEPLOY.md`.
- [x] **Verificado local**: login, seed, crear fecha → 10 encuentros auto → duplicado 400 →
  publicar → lectura pública `isSoler:true`; 503 honesto en resultados/posiciones; 401 sin token.
- [x] **Fix fixture vacío**: API expone `_count.matchdays` publicados; el front defaultea al torneo con datos
  y el empty state sugiere otros torneos.

## Pendiente (en orden)

### 1. Repo remoto + primer deploy
- [x] Crear repo público en GitHub (`hectororviz/soler-site`), `git init` + push (sin `.env`).
- [ ] Verificar CI en verde (build + imágenes GHCR).
- [ ] En VPS: clonar, crear `.env` real, `docker compose -f docker-compose.prod.yml up -d`.
- [ ] Verificar `https://csdsoler.com.ar` y `/api/v1/health`. Cambiar `ADMIN_PASSWORD`. `SEED_ON_BOOT=false`.

### 2. Panel admin UI (`/admin`)
- [ ] Login (usa `POST /api/v1/admin/auth/login`, guarda token, interceptor `Authorization`).
- [ ] Layout admin (sidebar + topbar, separado del sitio público) + dashboard con conteos reales.
- [ ] CRUD temporadas / torneos / categorías / clubes (con carga de escudo → `POST /admin/clubs/crest`).
- [ ] Inscripción de clubes por torneo (con categorías habilitadas).
- [ ] **Wizard de fixture**: torneo → fecha → enfrentamientos → encuentros auto → ajustar horario/sede → publicar.
- [ ] ABM transmisiones (vincular a encuentro, estados), contenidos, sponsors, galería.
- [ ] Toasts, confirmaciones, validación visible de errores del backend.

### 3. Páginas públicas restantes (Fase B)
- [ ] `/competiciones` + detalle (usa `/tournaments`, `/categories`).
- [ ] `/resultados` (hoy 503 → mostrar estado "no disponible", distinto de "sin resultados").
- [ ] `/posiciones` (idem; tabla con scroll horizontal + fila Soler).
- [ ] `/soler-tv` (live + programadas; embed o botón a `streaming.csdsoler.com.ar`).
- [ ] `/el-club`, `/galeria` (lightbox + teclado), `/contacto` (solo datos reales de content/sponsors).

### 4. Integración Ligas Deportivas (Etapa 3)
- [ ] Módulo `leagues-integration` en backend (solo backend, credenciales en env, nunca al navegador).
- [ ] Mapeo por `externalId` (torneos/categorías/clubes). Normalizar a `MatchSummary`/`StandingRow`.
- [ ] `GET /results`, `/standings` reales con caché corta + fallback 503 si cae (sin tumbar el sitio).
- [ ] Job o reconciliación de estados de fixture vs resultados oficiales.

### 5. Soler TV real (Etapa 5)
- [ ] Adaptador al sistema de streaming (contrato `PROGRAMADA/EN_VIVO/FINALIZADA/INTERRUMPIDA` ya definido).
- [ ] `GET /broadcasts/live` verificado contra señal real. Polling cada 30s (ya en front).
- [ ] Decidir embed vs link según lo que permita el proveedor. Sin URLs hardcodeadas.

### 6. Calidad final (Etapa 6)
- [ ] SEO: meta por página, Open Graph, sitemap, robots, canonical.
- [ ] Rendimiento: LCP ≤2.5s, CLS ≤0.1 (hero preload, lazy imágenes, code splitting).
- [ ] Accesibilidad WCAG 2.2 AA: auditoría teclado/contraste/foco.
- [ ] Backups programados (cron: `pg_dump` + volumen `uploads`).
- [ ] Cambiar `ADMIN_PASSWORD`, rotar `JWT_SECRET`, revisar CORS.

## Decisiones tomadas
- Prisma 6 (no v8 RC). `prisma.config.ts` de skills eliminado.
- Seed idempotente (upserts) + `SEED_ON_BOOT` para primer arranque.
- `package.json#prisma.seed` → `node dist-seed/seed.js` en prod (sin tsx).
- `.tsbuildinfo` excluido del contexto Docker (rompía `nest build` incremental).
- Fixture default = torneo con fechas publicadas; filtros siempre en URL.
- CORS local incluye `localhost` y `127.0.0.1` (puertos 5173/8080); en prod solo `https://csdsoler.com.ar`.
- Resultados/posiciones: 503 honesto hasta Etapa 3, nunca datos inventados.
