# Despliegue en VPS (caddy-docker-proxy, red `caddy-net`)

## Requisitos previos
- VPS con `caddy-docker-proxy` corriendo y red externa `caddy-net` (`docker network ls`).
- DNS `*.csdsoler.com.ar` apuntando al VPS (ya configurado).
- Repo público clonado en el VPS. Imágenes en GHCR (las publica CI en cada push a `main`).

## Primera vez
1. `cp .env.example .env` y completar valores reales:
   - `POSTGRES_PASSWORD`, `JWT_SECRET`, `ADMIN_PASSWORD` (claves fuertes, únicas).
   - `BACKEND_IMAGE=ghcr.io/<owner>/<repo>-backend:latest`
   - `FRONTEND_IMAGE=ghcr.io/<owner>/<repo>-frontend:latest`
   - `SEED_ON_BOOT=true` (carga inicial: torneos, categorías, clubes + escudos, Soler inscripto).
2. `docker compose -f docker-compose.prod.yml --env-file .env up -d`
3. Verificar: `https://api.csdsoler.com.ar/api/v1/health` → `{"status":"ok","db":"up"}`.
4. Cambiar la clave admin si se usó una temporal (vía API o DB).
5. Poner `SEED_ON_BOOT=false` en `.env` tras el primer arranque (los upserts son idempotentes, pero evita resembrar).

## Actualizar
- `docker compose -f docker-compose.prod.yml pull && docker compose -f docker-compose.prod.yml up -d`
- (Futuro) automatizar por webhook o watchtower.

## Backups
- DB: `docker exec csd-soler-prod-postgres-1 pg_dump -U postgres csd_soler > backup-$(date +%F).sql` (programar en cron).
- Archivos: volumen `uploads` (`docker volume inspect`), respaldar junto a la DB.

## Notas
- Nada bindea 80/443: Caddy descubre `csdsoler.com.ar` y `api.csdsoler.com.ar` por labels.
- CORS del backend solo permite `https://csdsoler.com.ar`.
- `VITE_API_URL` queda fijo en build (`https://api.csdsoler.com.ar/api/v1` vía CI).
