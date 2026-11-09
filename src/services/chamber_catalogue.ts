/**
 * The chambers bundled with the game, in play order.
 */
import chamberOneData from '@/chambers/chamber_1.json'
import chamberTwoData from '@/chambers/chamber_2.json'
import chamberThreeData from '@/chambers/chamber_3.json'
import type {ChamberData} from '@/game/chamber_data'

export type ChamberEntry = {
  id: number // Permanent, 0 or more: 0 is the tutorial's, the others are given in the order chambers were created; it names the chamber's files, keys its stored progress and is sent as the analytics chamber_id, so changing one splits that chamber's analytics history
  number: number // Position in the list below, counted from 0, shown to the player and used in the address; derived, never typed by hand
  data: ChamberData // Layout loaded into the game
}

/** A chamber as listed: its number comes from where it sits in the list. */
type ChamberListing = {
  id: number // Permanent id, see ChamberEntry
  data: ChamberData // Layout loaded into the game
}

// Play order: moving an entry renumbers the chambers, its id stays
const CHAMBER_LISTINGS: ChamberListing[] = [
  {
    id: 1,
    data: chamberOneData,
  },
  {
    id: 2,
    data: chamberTwoData,
  },
  {
    id: 3,
    data: chamberThreeData,
  },
]

export const CHAMBERS: ChamberEntry[] = CHAMBER_LISTINGS.map((listing, index) => ({
  id: listing.id,
  number: index,
  data: listing.data,
}))

/**
 * Logs an error for every chamber whose id is not a whole number of 0 or
 * more, or is already taken by an earlier chamber. Run in development only.
 */
function reportInvalidIds(): void {
  const seenIds = new Set<number>()
  for (const chamber of CHAMBERS) {
    if (!Number.isInteger(chamber.id) || chamber.id < 0) {
      console.error(`Chamber ${chamber.number} has id ${chamber.id}, which is not a whole number of 0 or more`)
    } else if (seenIds.has(chamber.id)) {
      console.error(`Chamber ${chamber.number} has id ${chamber.id}, already used by an earlier chamber`)
    }
    seenIds.add(chamber.id)
  }
}

if (import.meta.env.DEV) {
  reportInvalidIds()
}

/**
 * Looks up a chamber by its number.
 * @param chamberNumber - Chamber number, counted from 0
 * @returns The chamber, or undefined when no chamber has that number
 */
export function findChamber(chamberNumber: number): ChamberEntry | undefined {
  return CHAMBERS.find((chamber) => chamber.number === chamberNumber)
}
