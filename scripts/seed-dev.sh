#!/usr/bin/env bash
set -euo pipefail

# Ejecuta el seed de desarrollo
npx prisma db seed
