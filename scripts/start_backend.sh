#!/usr/bin/env bash
# Personal Safety Agent - 24/7 Backend Safety Engine (Linux / macOS)
set -e
echo "=== ЗАПУСК PERSONAL SAFETY AGENT BACKEND (PORT 3001) ==="
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR/../backend"

if [ ! -d "node_modules" ]; then
    echo "Встановлення залежностей backend..."
    npm install
fi

if [ ! -f "dist/server.js" ]; then
    echo "Компіляція TypeScript..."
    npm run build
fi

echo "Запуск автономного моніторингу загроз 24/7..."
node dist/server.js
