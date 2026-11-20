import path from 'node:path'
import {defineConfig} from 'vite'

const repo = '/home/max/Repositories/atomic/portal-2d'
const here = import.meta.dirname

export default defineConfig({
  root: here,
  logLevel: 'warn',
  resolve: {
    alias: [
      {find: /^@\/game\/renderer$/, replacement: path.join(here, 'patched/renderer.ts')},
      {find: /^@\/game\/sprite_sources$/, replacement: path.join(here, 'patched/sprite_sources.ts')},
      {find: /^@\//, replacement: `${repo}/src/`},
    ],
  },
  build: {
    outDir: path.join(here, 'dist'),
    emptyOutDir: true,
    lib: {
      entry: path.join(here, 'entry.ts'),
      name: 'ChamberEngine',
      formats: ['iife'],
      fileName: () => 'engine.js',
    },
  },
})
