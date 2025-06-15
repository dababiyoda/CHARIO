#!/usr/bin/env bash
set -e
HOST=${1:-localhost}
USER=${2:-$PGUSER}
for i in {1..30}; do
  if pg_isready -h "$HOST" -U "$USER"; then
    echo "Postgres is ready"
    exit 0
  fi
  echo "Waiting for postgres..."
  sleep 2
done

echo "Failed to connect to Postgres" >&2
docker-compose ps || true
docker logs postgres || true
exit 1
