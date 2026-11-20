import path from 'node:path'
import {defineConfig} from 'vite'

// Bundles the game's real drawing code, its chambers and its sprites into one
// script, build/engine.js, that defines the global ChamberEngine (see
// engine/entry.ts). Four game files are swapped for the patched copies that
// engine/patch_sources.py writes; every other import is the game's own file.

const here = import.meta.dirname
const mixer = path.resolve(here, '..')
const repo = path.resolve(mixer, '../..')
const patched = (name) => ({
  find: new RegExp(`^@/game/${name}$`),
  replacement: path.join(mixer, 'build/patched', `${name}.ts`),
})

export default defineConfig({
  root: mixer,
  logLevel: 'warn',
  resolve: {
    alias: [
      patched('renderer'),
      patched('sprite_sources'),
      patched('tile_painter'),
      patched('element_drawings'),
      {
        find: /^@\//,
        replacement: `${repo}/src/`,
      },
    ],
  },
  build: {
    outDir: path.join(mixer, 'build'),
    // The patched sources live in build/ too
    emptyOutDir: false,
    // A library build inlines every asset, so the sprites travel inside the script as data URLs
    lib: {
      entry: path.join(here, 'entry.ts'),
      name: 'ChamberEngine',
      formats: ['iife'],
      fileName: () => 'engine.js',
    },
  },
})
