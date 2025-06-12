#!/usr/bin/env bash
# Usage: ./scripts/sync-secrets.sh replit|fly
set -e
TARGET=$1
source .env
case $TARGET in
  replit) replit secrets set $(xargs <.env) ;;
  fly)    while IFS="=" read -r k v; do fly secrets set "$k=$v"; done < .env ;;
esac
