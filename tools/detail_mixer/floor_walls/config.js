// ============================================================
// The layers that add detail, and the combinations offered as presets
// ============================================================

const TECHNIQUES = [
  {id: 'floorShade', group: 'floor', name: 'Tile shade', what: 'Every floor tile a slightly different shade; one in fourteen clearly off, like a panel replaced later.', amount: 45},
  {id: 'floorPatches', group: 'floor', name: 'Large patches', what: 'Soft darker areas several tiles wide, so big empty rooms are not one flat colour.', amount: 50},
  {id: 'roomLight', group: 'floor', name: 'Room light', what: 'The floor darkens towards the walls and stays bright in the open, so rooms get depth.', amount: 45},
  {id: 'grime', group: 'floor', name: 'Grime at walls', what: 'Patchy dirt gathered along the foot of the walls.', amount: 50},
  {id: 'floorScuffs', group: 'floorWear', name: 'Scuffs', what: 'Soft dark smears, as a boot or a dragged box leaves.', amount: 60, density: 4, mark: 'scuffs'},
  {id: 'floorScratches', group: 'floorWear', name: 'Scratches', what: 'A few thin lines scraped side by side into a tile.', amount: 60, density: 4, mark: 'scratches'},
  {id: 'floorStains', group: 'floorWear', name: 'Stains', what: 'A dried puddle, darker along its rim; it can run on over the next tile.', amount: 60, density: 3, mark: 'stains'},
  {id: 'floorCracks', group: 'floorWear', name: 'Cracks', what: 'A crack running in from a tile’s edge, kept inside its own tile.', amount: 60, density: 2, mark: 'cracks'},
  {id: 'floorChips', group: 'floorWear', name: 'Chipped corners', what: 'A small piece broken off a tile’s corner.', amount: 60, density: 2, mark: 'chips'},
  {id: 'wallShade', group: 'walls', name: 'Panel shade', what: 'Each wall tile’s top a slightly lighter or darker plate.', amount: 40},
  {id: 'wallPatches', group: 'walls', name: 'Large patches', what: 'Soft lighter and darker areas across the wall mass.', amount: 50},
  {id: 'wallScuffs', group: 'wallWear', name: 'Scuffs', what: 'Soft dark smears on the wall tops.', amount: 60, density: 4, mark: 'scuffs'},
  {id: 'wallScratches', group: 'wallWear', name: 'Scratches', what: 'Thin bright lines scraped into the wall tops.', amount: 60, density: 6, mark: 'scratches'},
  {id: 'wallStains', group: 'wallWear', name: 'Stains', what: 'Soft darker or lighter blots on the wall tops.', amount: 60, density: 4, mark: 'stains'},
]

const FLOOR_WEAR = ['floorScuffs', 'floorScratches', 'floorStains', 'floorCracks', 'floorChips']
const WALL_WEAR = ['wallScuffs', 'wallScratches', 'wallStains']

/** Settings with everything off, every amount at its starting value. */
function baseSettings() {
  const settings = {
    seed: 1,
    on: {},
    amount: {},
    density: {},
  }

  for (const technique of TECHNIQUES) {
    settings.on[technique.id] = false
    settings.amount[technique.id] = technique.amount

    if (technique.density !== undefined) {
      settings.density[technique.id] = technique.density
    }
  }

  return settings
}

/** Settings with only the named layers on, at their starting amounts but for the overrides. */
function settingsWith(ids, amounts = {}, densities = {}) {
  const settings = baseSettings()

  for (const id of ids) {
    settings.on[id] = true
  }

  Object.assign(settings.amount, amounts)
  Object.assign(settings.density, densities)

  return settings
}

/** The same value for each of the named layers. */
function each(ids, value) {
  return Object.fromEntries(ids.map((id) => [id, value]))
}

const PRESETS = [
  {id: 'original', name: 'Original', what: 'The game as it is now.', make: () => settingsWith([])},
  {id: 'pick', name: 'My pick', what: 'Tone first, wear second: shade, patches and room light on the floor, wear on one tile in ten, patches and a light shade on the walls.', make: () => settingsWith(['floorShade', 'floorPatches', 'roomLight', ...FLOOR_WEAR, 'wallPatches', 'wallShade'], {wallShade: 25}, {floorScuffs: 3, floorScratches: 3, floorStains: 2, floorCracks: 1, floorChips: 1})},
  {id: 'subtle', name: 'Subtle', what: 'Shade and patches only: no marks at all.', make: () => settingsWith(['floorShade', 'floorPatches', 'wallShade', 'wallPatches'], {floorShade: 35, floorPatches: 40, wallShade: 30, wallPatches: 40})},
  {id: 'wear', name: 'Wear only', what: 'Only the marks, on the plain floor and walls: what wear does with no change of tone.', make: () => settingsWith([...FLOOR_WEAR, ...WALL_WEAR])},
  {id: 'worn', name: 'Worn', what: 'An old facility: heavy wear and grime everywhere.', make: () => settingsWith(['floorShade', 'floorPatches', 'grime', ...FLOOR_WEAR, 'wallShade', 'wallPatches', ...WALL_WEAR], {...each(FLOOR_WEAR, 75), grime: 65}, {floorScuffs: 8, floorScratches: 8, floorStains: 5, floorCracks: 4, floorChips: 4, wallScuffs: 5, wallScratches: 9, wallStains: 5})},
]
