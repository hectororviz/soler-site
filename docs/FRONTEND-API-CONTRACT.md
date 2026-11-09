# Contrato frontend → API propia (Fase A/B)

El frontend **solo** consume la API propia (`VITE_API_URL` + `/api/v1`).
Nunca llama a Supabase de Ligas Deportivas ni expone credenciales.

## Estado actual

- Backend **implementado y verificado en local** (NestJS + Prisma + Postgres en Docker).
  - Seed: temporada 2026, 3 torneos con categorías, 72 clubes con escudos, Soler inscripto en todo.
  - Flujo probado: login → crear fecha → enfrentamiento (10 encuentros auto-generados) →
    rechazo de duplicado → publicar → lectura pública con `isSoler: true`.
  - Resultados/posiciones devuelven **503 honesto** hasta la Etapa 3 (Ligas Deportivas).
- En dev con `VITE_USE_MOCKS=true` se usan mocks locales. Con `false`, el frontend
  consume el backend real (`VITE_API_URL`).

## Endpoints que la portada necesita (Etapa 3 del proyecto)

| Uso en home | Método + path | Respuesta esperada |
|---|---|---|
| Próximos partidos | `GET /api/v1/fixtures/upcoming?limit=6` | `MatchSummary[]` |
| Últimos resultados | `GET /api/v1/results?limit=6` | `MatchSummary[]` (solo FINALIZADO, marcador confirmado) |
| En vivo | `GET /api/v1/broadcasts/live` | `Broadcast \| null` — `status` debe ser `EN_VIVO` verificado por streaming |
| Competiciones | `GET /api/v1/tournaments` | `Tournament[]` con `season`, `categories` y `_count.matchdays` (fechas publicadas). |
| Categorías | `GET /api/v1/categories?tournament=<id>` | `Category[]` del torneo. |
| Fixture | `GET /api/v1/tournaments/:slug/fixture?categoria=` | `FixtureRound[]` (solo fechas publicadas, todos los cruces, destaque `isSoler`). |
| Sponsors / galería / club | `GET /api/v1/sponsors`, `GET /api/v1/content?slot=` | Listas administrables; si vacías, la home muestra empty real |

## Pantallas siguientes y sus dependencias

- `/fixture` → `GET /api/v1/fixtures?torneo=&categoria=&fecha=` + `GET /api/v1/tournaments`, `/categories`, `/matchdays`
- `/resultados` → `GET /api/v1/results?...` (fuente: Ligas Deportivas normalizada por backend)
- `/posiciones` → `GET /api/v1/standings?torneo=&categoria=` (orden oficial intacto;
  `categoria=general` suma solo `categories.is_competitive=true`, igual que el sitio oficial —
  ej. `2020` es no competitiva en Domingos/Sábados y se excluye de la general pero sigue visible por categoría)
- `/soler-tv` → `GET /api/v1/broadcasts?scope=active|upcoming`
- `/admin/*` → `POST /api/v1/admin/auth/login` + CRUD (Etapa 1-2 backend NestJS/Prisma)

## Reglas que el frontend ya respeta

1. `EN_VIVO` solo si `GET /broadcasts/live` devuelve `status: EN_VIVO`.
2. `ScoreDisplay` muestra "Resultado a confirmar", nunca `0-0` inventado.
3. `MatchStatusBadge` y `BroadcastBadge` comunican estado con texto, no solo color.
4. Filtros futuros deben sincronizarse con URL (spec §6.1, §15.1).
5. `VITE_STREAMING_URL` configurable; sin URLs hardcodeadas fuera de config.

## Variables de entorno (frontend)

- `VITE_API_URL` — ej. `https://api.csdsoler.com.ar/api/v1`
- `VITE_API_TIMEOUT_MS` — default `8000`
- `VITE_USE_MOCKS` — `true` solo en dev
- `VITE_STREAMING_URL` — default `https://streaming.csdsoler.com.ar`

## Verificación Fase A

- `npm run build` OK (tsc + vite).
- Responsive: mobile-first, `max-w-site 1280px`, grids `md:grid-cols-3`, tablas con `.table-scroll`, header drawer con Escape/foco/bloqueo scroll, sin `overflow-x` global.
- Pendiente cuando exista backend: apuntar `VITE_API_URL` al backend real, poner `VITE_USE_MOCKS=false`, validar cada sección en 320/375/768/1024/1440.
