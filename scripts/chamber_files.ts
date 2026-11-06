import {readdirSync} from 'node:fs'
import chamber1 from '@/chambers/chamber_1.json'
import chamber2 from '@/chambers/chamber_2.json'
import chamber3 from '@/chambers/chamber_3.json'
import type {ChamberData} from '@/game/chamber_data'

// The chamber files the engine scripts run, shared so that every script
// checks the same chambers. The scripts can't load the catalogue, which reads
// Vite's development flag, so the chambers are listed here as well

/** Every chamber file, by file name; the engine scripts fail on a chamber file missing here */
export const CHAMBER_FILES: Readonly<Record<string, ChamberData>> = {
  'chamber_1.json': chamber1,
  'chamber_2.json': chamber2,
  'chamber_3.json': chamber3,
}

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
