#!/bin/sh
set -e

# Apply pending migrations, then start the standalone server. The migration
# script is idempotent, so restarting the container is always safe.
node ./scripts/migrate.mjs
exec node server.js
