#!/bin/bash
set -Eeuo pipefail

COZE_WORKSPACE_PATH="${COZE_WORKSPACE_PATH:-$(pwd)}"

cd "${COZE_WORKSPACE_PATH}"

echo "Installing dependencies..."
pnpm install --prefer-frozen-lockfile --prefer-offline --loglevel debug --reporter=append-only

echo "Bundling noVNC for browser..."
npx esbuild node_modules/@novnc/novnc/core/rfb.js --bundle --format=esm --outfile=public/novnc-rfb.js || true

echo "Building the Next.js project..."
pnpm next build

echo "Bundling server with tsup..."
pnpm tsup src/server.ts --format cjs --platform node --target node20 --outDir dist --no-splitting --no-minify --external ssh2 --external ws --external better-sqlite3 --external bcryptjs --external jsonwebtoken

echo "Build completed successfully!"
