#!/bin/bash
# start.sh – Start the EDC system (backend + frontend dev server)
# Usage: bash start.sh

set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "=== Installing backend dependencies ==="
cd "$ROOT/backend" && npm install

echo "=== Installing frontend dependencies ==="
cd "$ROOT/frontend" && npm install

echo "=== Building frontend ==="
cd "$ROOT/frontend" && npm run build

echo "=== Starting backend server ==="
cd "$ROOT/backend"
node --experimental-sqlite src/server.js &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"

echo ""
echo "✅  Backend API:    http://localhost:3001/api"
echo "✅  Frontend build: $ROOT/frontend/dist"
echo ""
echo "To serve frontend + backend together, point a web server (nginx/caddy)"
echo "at frontend/dist with /api proxy to localhost:3001"
echo ""
echo "Press Ctrl+C to stop."
wait $BACKEND_PID
