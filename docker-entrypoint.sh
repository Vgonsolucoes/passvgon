#!/bin/sh
set -e

echo "[PassVGON] Iniciando aplicação..."
echo "[PassVGON] APP_ENV: ${APP_ENV:-undefined}"
echo "[PassVGON] SKIP_MIGRATIONS: ${SKIP_MIGRATIONS:-false}"

if [ "${SKIP_MIGRATIONS:-false}" != "true" ]; then
  echo "[PassVGON] Executando migrações de banco de dados..."
  if npx prisma migrate deploy; then
    echo "[PassVGON] Migrações aplicadas com sucesso."
  else
    echo "[PassVGON] ERRO ao aplicar migrações. Abortando."
    exit 1
  fi
else
  echo "[PassVGON] Pulando migrações (SKIP_MIGRATIONS=true)."
fi

echo "[PassVGON] Iniciando servidor Next.js em 0.0.0.0:${PORT:-3000}..."
exec node server.js
