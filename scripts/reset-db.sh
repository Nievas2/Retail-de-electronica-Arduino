#!/usr/bin/env bash
set -euo pipefail

# Resetea base local: borra contenedor y volumen, recrea y migra

echo "Deteniendo servicios"
docker compose down

echo "Borrando volumen (datos)"
docker volume rm -f arduino_pgdata 2>/dev/null || true

echo "Levantando Postgres limpio"
docker compose up -d

echo "Migrando base"
npx prisma migrate dev

echo "Seed"
npx prisma db seed

echo "OK: base reseteada"
