import {readdirSync} from 'node:fs'
import chamber0 from '@/chambers/chamber_0.json'
import chamber1 from '@/chambers/chamber_1.json'
import chamber2 from '@/chambers/chamber_2.json'
import chamber3 from '@/chambers/chamber_3.json'
import chamber4 from '@/chambers/chamber_4.json'
import chamber5 from '@/chambers/chamber_5.json'
import chamber6 from '@/chambers/chamber_6.json'
import chamber7 from '@/chambers/chamber_7.json'
import chamber8 from '@/chambers/chamber_8.json'
import chamber9 from '@/chambers/chamber_9.json'
import playground from '@/dev/playground.json'
import type {ChamberData} from '@/game/chamber_data'

// The chamber files the engine scripts run, shared so that every script
// checks the same chambers. The scripts can't load the catalogue, which reads
// Vite's development flag, so the chambers are listed here as well

/** Every chamber file, by file name; the engine scripts fail on a chamber file missing here */
export const CHAMBER_FILES: Readonly<Record<string, ChamberData>> = {
  'chamber_0.json': chamber0,
  'chamber_1.json': chamber1,
  'chamber_2.json': chamber2,
  'chamber_3.json': chamber3,
  'chamber_4.json': chamber4,
  'chamber_5.json': chamber5,
  'chamber_6.json': chamber6,
  'chamber_7.json': chamber7,
  'chamber_8.json': chamber8,
  'chamber_9.json': chamber9,
}

/** The playground (src/dev/playground.json), the development-only chamber for trying every element: checked, settled and walked like a chamber file, but it has no recorded solution and the solver leaves it out */
export const PLAYGROUND_FILE = 'playground.json'

/** The playground's layout */
export const PLAYGROUND_DATA: ChamberData = playground

/** Where the chamber files and their recorded solutions are */
export const CHAMBERS_DIRECTORY = new URL('../src/chambers/', import.meta.url)

/** A chamber layout's file name, as opposed to the solutions and other JSON next to it */
const CHAMBER_FILE = /^chamber_\d+\.json$/

/**
 * Lists the chamber files in src/chambers, in number order.
 * @returns Their file names
 */
export function listChamberFiles(): string[] {
  return readdirSync(CHAMBERS_DIRECTORY)
    .filter((name) => CHAMBER_FILE.test(name))
    .sort((first, second) => first.localeCompare(second, 'en', {
      numeric: true,
    }))
}
