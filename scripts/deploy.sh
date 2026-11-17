#!/usr/bin/env bash

set -e

# -f skips the checks but still builds the app
if [ "$1" = "-f" ]; then
  npm run build
else
  npm run verify
fi
firebase deploy --only hosting
