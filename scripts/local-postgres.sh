#!/usr/bin/env bash
# Start single-user Postgres on a random port
pg_ctl -D .pgdata -o "-F -p 5433" -l logfile start
createdb -p 5433 obvio_local || true
