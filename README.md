# CSD Soler — csdsoler.com.ar

Plataforma deportiva e institucional del Club Social y Deportivo Soler.
Punto central de fixture, resultados, posiciones y transmisiones.

## Estructura

- `frontend/` — React + Vite + TS + Tailwind. Solo consume la API propia.
- `backend/` — NestJS + Prisma 6 + PostgreSQL. API versionada `/api/v1`.
- `docker-compose.yml` — desarrollo local (postgres + backend + frontend).
- `docker-compose.prod.yml` — VPS con caddy-docker-proxy (red externa `caddy_net`).
- `docs/` — contrato de API (`FRONTEND-API-CONTRACT.md`), despliegue (`DEPLOY.md`).
- `TODO.md` — estado del proyecto y pasos siguientes.

## Desarrollo local

1. `cp .env.example .env` (ajustar `ADMIN_PASSWORD`).
2. `docker compose up -d postgres backend` — API en http://localhost:3000/api/v1/health
   (migra + seed automático: torneos, 72 clubes, escudos).
3. `cd frontend && npm install && npm run dev` — sitio en http://127.0.0.1:5173/
   (`VITE_USE_MOCKS=true` usa datos locales; `false` usa el backend real).
4. Todo el stack (imágenes locales): `docker compose up -d` — frontend en http://localhost:8080/.

## Reglas (de la especificación)

- Sin hardcodear torneos/categorías/clubes/colores/URLs. Todo administrable.
- Resultados y posiciones vienen de Ligas Deportivas (Etapa 3); sin duplicar fuentes.
- Sin `EN_VIVO` sin señal verificada. Sin resultados inventados.
- Frontend nunca toca Supabase externo. Credenciales solo en env.

## Documentos de especificación

- `CSD SOLER — Especificación completa de frontend para OpenCode.txt` (frontend).
- El documento original "CSD Soler — Especificación funcional, técnica y de diseño"
  vive en el hilo de trabajo (base de reglas de negocio y arquitectura).
