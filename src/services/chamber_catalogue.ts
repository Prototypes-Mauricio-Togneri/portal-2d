/**
 * The chambers bundled with the game, in play order.
 */
import chamberOneData from '@/chambers/chamber_1.json'
import chamberTwoData from '@/chambers/chamber_2.json'
import chamberThreeData from '@/chambers/chamber_3.json'
import type {ChamberData} from '@/game/chamber_data'

export type ChamberEntry = {
  number: number // 1-based position, shown to the player and used in the address
  subtitle: string // What the chamber tests, shown under its name on the home screen
  data: ChamberData // Layout loaded into the game
}

export const CHAMBERS: ChamberEntry[] = [
  {
    number: 1,
    subtitle: 'Basic mechanics',
    data: chamberOneData,
  },
  {
    number: 2,
    subtitle: 'Portal logic',
    data: chamberTwoData,
  },
  {
    number: 3,
    subtitle: 'Advanced testing',
    data: chamberThreeData,
  },
]

/**
 * Looks up a chamber by its number.
 * @param chamberNumber - 1-based chamber number
 * @returns The chamber, or undefined when no chamber has that number
 */
export function findChamber(chamberNumber: number): ChamberEntry | undefined {
  return CHAMBERS.find((chamber) => chamber.number === chamberNumber)
}
