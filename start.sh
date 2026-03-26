#!/bin/bash
# start.sh – One-click setup and launch for the EDC system
# Usage: bash start.sh
#
# Requires: Node.js >= 22.5

set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "=== Installing backend dependencies ==="
cd "$ROOT/backend" && npm install --silent

echo "=== Installing frontend dependencies ==="
cd "$ROOT/frontend" && npm install --silent

echo "=== Building frontend ==="
cd "$ROOT/frontend" && npm run build

echo ""
echo "=== Starting EDC system ==="
cd "$ROOT/backend"
node src/server.js &
SERVER_PID=$!

# Wait briefly to confirm the server started
sleep 1
if ! kill -0 "$SERVER_PID" 2>/dev/null; then
  echo "ERROR: Server failed to start."
  exit 1
fi

echo ""
echo "✅  系统已就绪，请在浏览器中打开："
echo ""
echo "    http://localhost:3001"
echo ""
echo "按 Ctrl+C 可停止系统。"
wait $SERVER_PID
