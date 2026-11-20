#!/bin/sh
# Builds the mixer's engine: patches copies of four game files, then bundles
# the game's real renderer, its chambers and its sprites into build/engine.js.
# Run it again whenever the game's drawing code, a chamber or a sprite changes.
set -e
cd "$(dirname "$0")"
python3 engine/patch_sources.py
node ../../node_modules/vite/bin/vite.js build --config engine/vite.config.mjs
ls -l build/engine.js
