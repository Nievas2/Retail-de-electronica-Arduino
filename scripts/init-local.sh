#!/usr/bin/env bash
set -euo pipefail

# Inicializa ambiente local (Postgres + migrate + seed)

echo "[1/4] Levantando Postgres (docker compose)"
docker compose up -d

echo "[2/4] Instalando dependencias"
npm install

echo "[3/4] Migrando base de datos"
npx prisma migrate dev

echo "[4/4] Ejecutando seed"
npx prisma db seed

echo "OK: ambiente local listo"
