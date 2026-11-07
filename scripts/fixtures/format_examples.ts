import type {ChamberDataV2} from '@/game/chamber_data_v2'
import formatV2Example from '@scripts/fixtures/format_v2_example.json'

// Chamber files in format 2, outside the catalogue, for the chamber checks
// (stage 01, E4). Each is typed here without a cast, so the build fails when
// a file doesn't fit the format

/** A format 2 chamber using every addition (walls refusing portals, a link group named by a button and a switch, an empty par) and leaving out every list it doesn't need */
export const FORMAT_V2_EXAMPLE: ChamberDataV2 = formatV2Example
