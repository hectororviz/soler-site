#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

COMPOSE_FILE="docker-compose.prod.yml"

echo "==> Pull de imagenes (todas, por las dudas)..."
docker compose -f "$COMPOSE_FILE" pull

echo "==> Levantando servicios..."
docker compose -f "$COMPOSE_FILE" up -d --remove-orphans

echo "==> Estado actual:"
docker compose -f "$COMPOSE_FILE" ps
