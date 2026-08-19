#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
npm install --no-audit --no-fund
exec npm run dev -- -H 0.0.0.0 -p 8080
