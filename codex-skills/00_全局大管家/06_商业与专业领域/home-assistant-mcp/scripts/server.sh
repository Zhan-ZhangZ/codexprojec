#!/bin/bash

# Try to use Bun if available, fallback to Node.js
if command -v ~/.bun/bin/bun >/dev/null 2>&1; then
  echo "Using Bun from ~/.bun/bin/bun"
  ~/.bun/bin/bun run --env-file /Users/linus/Code/mcp-hass-server/.env src/index.ts --stdio -
elif command -v bun >/dev/null 2>&1; then
  echo "Using system Bun"
  bun run --env-file /Users/linus/Code/mcp-hass-server/.env src/index.ts --stdio -
else
  echo "Bun not found, using Node.js"
  node --no-warnings dist/index.js --stdio
fi


