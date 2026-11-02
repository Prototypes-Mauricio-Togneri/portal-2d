/**
 * The chambers bundled with the game, in play order.
 */
import chamberOneData from '@/chambers/chamber_1.json'
import chamberTwoData from '@/chambers/chamber_2.json'
import chamberThreeData from '@/chambers/chamber_3.json'
import type {ChamberData} from '@/game/chamber_data'

export type ChamberEntry = {
  id: number // Permanent, given in the order chambers were created and never reused, so analytics history survives reordering
  number: number // 1-based position, shown to the player and used in the address
  data: ChamberData // Layout loaded into the game
}

export const CHAMBERS: ChamberEntry[] = [
  {
    id: 1,
    number: 1,
    data: chamberOneData,
  },
  {
    id: 2,
    number: 2,
    data: chamberTwoData,
  },
  {
    id: 3,
    number: 3,
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
