// ============================================================
// The things that take detail, their layers, the choices that
// are not strengths, and the combinations offered as presets
// ============================================================

/** The seven things on the list, the pit and the grate apart: each its own panel, each with its own layers. */
const THINGS = [
  {id: 'box', name: 'Box', sprites: 'box', salt: 1, keep: 'Its outline, so its shadow and its pieces stay the same.'},
  {id: 'mirror', name: 'Mirror box', sprites: 'box_mirror', salt: 2, keep: 'The mirror: frame, lit glass and glint say which way a ray turns.'},
  {id: 'button', name: 'Button', sprites: 'button_up, button_pressed', salt: 3, keep: 'The dome’s red, and released against pressed. One look per button, laid over whichever sprite is drawn.'},
  {id: 'switch', name: 'Switch', sprites: 'switch', salt: 4, keep: 'The dome’s yellow, the only thing that tells it from a button.'},
  {id: 'arrow', name: 'Floor arrow', sprites: 'arrow', salt: 5, keep: 'Its direction, and its reading as one chevron.'},
  {id: 'turntable', name: 'Turnable arrow', sprites: 'turntable, turntable_arrow', salt: 6, keep: 'The chevron’s way; nothing on the disc may point. The chevron’s wear turns with it, the disc’s never.'},
  {id: 'pit', name: 'Pit', sprites: 'ditch (open)', salt: 7, keep: 'A hole you can’t cross, its sides joined across tiles.'},
  {id: 'grate', name: 'Grate', sprites: 'ditch_bridged', salt: 8, keep: 'Walkable, and a grate: its slots and frame.'},
]

// Every layer: its thing, its kind (a tone on every instance, or wear on a share of them), what one
// row of the rail says about it, and how its strength is drawn (the formula the summary prints).
// "a" is the strength slider over 100.
const LAYERS = [
  // ---------- Box ----------
  {thing: 'box', id: 'tone', name: 'Own tone', type: 'tone', what: 'Each box’s plates a little lighter or darker, warmer or cooler than the next.', formula: 'shade up to 0.14·a, tint up to 0.07·a'},
  {thing: 'box', id: 'light', name: 'Room light', type: 'tone', what: 'Darker beside a wall, lifted in the open, as the floor under it.', formula: 'as the floor’s: dark 0.22·a at a wall, lift 0.15·a in the open'},
  {thing: 'box', id: 'edges', name: 'Worn edges', type: 'wear', what: 'The corner blocks’ outer edges worn light in short runs, as paint rubbed through.', formula: 'light dashes up to 0.75·a, a knocked corner 0.3·a'},
  {thing: 'box', id: 'scratches', name: 'Scratches', type: 'wear', what: 'A thin scrape or two across a block or a tab.', formula: 'cut 0.6·a, lit edge 0.45·a'},
  {thing: 'box', id: 'dents', name: 'Dents', type: 'wear', what: 'A small knock in a block’s outer corner, inside the outline.', formula: 'dent 0.55·a, lit rim 0.5·a'},
  {thing: 'box', id: 'disc', name: 'Rubbed disc', type: 'wear', what: 'The centre disc polished off-centre, with a faint ring rubbed round it.', formula: 'rubbed patch 0.3·a, ring 0.3·a'},
  {thing: 'box', id: 'dust', name: 'Dust', type: 'wear', what: 'A dull film on the plates, and fine specks in the dark channels.', formula: 'film 0.16·a, specks 0.6·a'},

  // ---------- Mirror box ----------
  {thing: 'mirror', id: 'tone', name: 'Own tone', type: 'tone', what: 'Each box’s plates a little lighter or darker, warmer or cooler. The mirror stays as drawn.', formula: 'shade up to 0.14·a, tint up to 0.07·a'},
  {thing: 'mirror', id: 'light', name: 'Room light', type: 'tone', what: 'Darker beside a wall, lifted in the open. The mirror stays as drawn.', formula: 'dark 0.22·a at a wall, lift 0.15·a in the open'},
  {thing: 'mirror', id: 'edges', name: 'Worn edges', type: 'wear', what: 'The corner blocks’ outer edges worn light in short runs.', formula: 'light dashes up to 0.75·a, a knocked corner 0.3·a'},
  {thing: 'mirror', id: 'scratches', name: 'Scratches', type: 'wear', what: 'A thin scrape across a block or a tab, stopping at the mirror’s frame.', formula: 'cut 0.6·a, lit edge 0.45·a'},
  {thing: 'mirror', id: 'dents', name: 'Dents', type: 'wear', what: 'A small knock in a block’s outer corner.', formula: 'dent 0.55·a, lit rim 0.5·a'},
  {thing: 'mirror', id: 'glass', name: 'Dull glass ends', type: 'wear', what: 'The glass a touch duller towards its two ends; the middle and the glint stay bright.', formula: 'film 0.35·a'},
  {thing: 'mirror', id: 'dust', name: 'Dust', type: 'wear', what: 'A dull film on the plates, and fine specks in the dark channels.', formula: 'film 0.16·a, specks 0.6·a'},

  // ---------- Button ----------
  {thing: 'button', id: 'tone', name: 'Own tone', type: 'tone', what: 'Each button’s plate and clamps a little lighter or darker, warmer or cooler. The dome stays its red.', formula: 'shade up to 0.12·a, tint up to 0.06·a'},
  {thing: 'button', id: 'light', name: 'Room light', type: 'tone', what: 'Plate and clamps darker beside a wall, as the floor. The dome stays its red.', formula: 'dark 0.22·a at a wall, lift 0.15·a in the open'},
  {thing: 'button', id: 'ring', name: 'Worn ring', type: 'wear', what: 'Grime gathered round the dome’s edge on the white plate, heavier in places.', formula: 'ring 0.45·a'},
  {thing: 'button', id: 'scratches', name: 'Scratches', type: 'wear', what: 'Thin scrapes on the white plate, where boxes are set down.', formula: 'cut 0.8·a'},
  {thing: 'button', id: 'clamps', name: 'Clamp wear', type: 'wear', what: 'The dark clamps’ paint worn pale at their outer corners and edges.', formula: 'worn paint 0.7·a'},
  {thing: 'button', id: 'dust', name: 'Dust', type: 'wear', what: 'Fine specks along the plate’s outer rim and beside the clamps.', formula: 'specks 0.7·a, rim film 0.25·a'},
  {thing: 'button', id: 'dome', name: 'Dome finish', type: 'wear', what: 'The dome a touch duller, or glossier, in its own red: the same on released and pressed. Watch the meaning checks.', formula: 'dull film 0.18·a or sheen 0.2·a'},

  // ---------- Switch ----------
  {thing: 'switch', id: 'tone', name: 'Own tone', type: 'tone', what: 'Each switch’s plate and clamps a little lighter or darker. The dome stays its yellow.', formula: 'shade up to 0.12·a, tint up to 0.06·a'},
  {thing: 'switch', id: 'light', name: 'Room light', type: 'tone', what: 'Plate and clamps darker beside a wall. The dome stays its yellow.', formula: 'dark 0.22·a at a wall, lift 0.15·a in the open'},
  {thing: 'switch', id: 'ring', name: 'Worn ring', type: 'wear', what: 'Grime gathered round the dome’s edge on the white plate.', formula: 'ring 0.45·a'},
  {thing: 'switch', id: 'scratches', name: 'Scratches', type: 'wear', what: 'Thin scrapes on the white plate.', formula: 'cut 0.8·a'},
  {thing: 'switch', id: 'clamps', name: 'Clamp wear', type: 'wear', what: 'The dark clamps’ paint worn pale at their outer corners and edges.', formula: 'worn paint 0.7·a'},
  {thing: 'switch', id: 'dust', name: 'Dust', type: 'wear', what: 'Fine specks along the plate’s outer rim and beside the clamps.', formula: 'specks 0.7·a, rim film 0.25·a'},
  {thing: 'switch', id: 'dome', name: 'Polished dome', type: 'wear', what: 'A paler patch where a hand lands, lighter, never warmer. Watch the meaning checks.', formula: 'sheen 0.3·a'},

  // ---------- Floor arrow ----------
  {thing: 'arrow', id: 'tone', name: 'Paint shade', type: 'tone', what: 'Each arrow’s paint a little lighter or darker than the next.', formula: 'shade up to 0.18·a'},
  {thing: 'arrow', id: 'light', name: 'Room light', type: 'tone', what: 'The paint darker beside a wall, as the floor under it.', formula: 'dark 0.22·a at a wall, lift 0.15·a in the open'},
  {thing: 'arrow', id: 'worn', name: 'Worn paint', type: 'wear', what: 'The paint thinned in soft patches, so the floor and its detail show through.', formula: 'paint taken off up to 0.75·a'},
  {thing: 'arrow', id: 'flakes', name: 'Flaked edges', type: 'wear', what: 'Small bites out of the stroke’s edges, where paint has flaked away.', formula: 'paint taken off 0.95·a'},
  {thing: 'arrow', id: 'scratches', name: 'Scratches', type: 'wear', what: 'A thin line or two scraped through the paint to the floor.', formula: 'paint taken off 0.9·a'},
  {thing: 'arrow', id: 'dirt', name: 'Dirt', type: 'wear', what: 'A faint darker film over parts of the paint.', formula: 'film up to 0.3·a'},

  // ---------- Turnable arrow ----------
  {thing: 'turntable', id: 'tone', name: 'Disc tone', type: 'tone', what: 'Each disc a shade lighter or darker than the next.', formula: 'shade up to 0.1·a'},
  {thing: 'turntable', id: 'light', name: 'Room light', type: 'tone', what: 'Disc and chevron darker beside a wall, as the floor.', formula: 'dark 0.22·a at a wall, lift 0.15·a in the open'},
  {thing: 'turntable', id: 'rings', name: 'Turning rings', type: 'wear', what: 'Fine scuffs round the disc, as a turning plate wears: arcs only, never a line that points.', formula: 'dark arcs 0.35·a, light arcs 0.25·a'},
  {thing: 'turntable', id: 'cut', name: 'Dirt in the cut', type: 'wear', what: 'Grime lying along the lit lip inside the cut ring, broken in places.', formula: 'grime 0.55·a'},
  {thing: 'turntable', id: 'worn', name: 'Worn chevron', type: 'wear', what: 'The chevron’s paint thinned in soft patches; it turns with the chevron.', formula: 'paint taken off up to 0.75·a'},
  {thing: 'turntable', id: 'flakes', name: 'Flaked chevron', type: 'wear', what: 'Small bites out of the chevron’s edges; they turn with it.', formula: 'paint taken off 0.95·a'},

  // ---------- Pit ----------
  {thing: 'pit', id: 'tone', name: 'Side shade', type: 'tone', what: 'The pit’s sides lighter and darker in long soft stretches, running on across tiles without a seam.', formula: 'shade up to 0.16·a'},
  {thing: 'pit', id: 'streaks', name: 'Streaks', type: 'wear', what: 'Thin streaks running down the sides from the rim, fading with depth.', formula: 'dark 0.5·a, light 0.18·a'},
  {thing: 'pit', id: 'rim', name: 'Chipped rim', type: 'wear', what: 'The lit rim broken in a short stretch or two.', formula: 'chip 0.9·a'},
  {thing: 'pit', id: 'debris', name: 'Debris', type: 'wear', what: 'A few faint bits lying on the bottom.', formula: 'bits 0.6·a'},
  {thing: 'pit', id: 'dust', name: 'Dust at the rim', type: 'wear', what: 'Floor dust spilling over the rim, a faint grey film at the top of the side.', formula: 'film 0.5·a'},

  // ---------- Grate ----------
  {thing: 'grate', id: 'tone', name: 'Own tone', type: 'tone', what: 'Each grate a little lighter or darker than the next.', formula: 'shade up to 0.12·a'},
  {thing: 'grate', id: 'light', name: 'Room light', type: 'tone', what: 'Darker beside a wall, lifted in the open.', formula: 'dark 0.22·a at a wall, lift 0.15·a in the open'},
  {thing: 'grate', id: 'worn', name: 'Worn bars', type: 'wear', what: 'A band of bars polished paler where feet cross the grate.', formula: 'polish 0.35·a'},
  {thing: 'grate', id: 'silt', name: 'Silted slots', type: 'wear', what: 'A few slots partly filled with grey grit.', formula: 'grit 0.65·a'},
  {thing: 'grate', id: 'dent', name: 'Dented corner', type: 'wear', what: 'One corner of the frame knocked in, with a lit crease.', formula: 'dent 0.5·a, crease 0.5·a'},
  {thing: 'grate', id: 'scratches', name: 'Scratches', type: 'wear', what: 'Thin bright scrapes along the frame.', formula: 'cut 0.5·a'},
]

for (const layer of LAYERS) {
  layer.key = `${layer.thing}.${layer.id}`
}

/** The choices that are not strengths, each with what it costs in the game. */
const CHOICES = [
  {id: 'carried', name: 'A carried box', options: [
    {id: 'plain', name: 'Plain', what: 'As now: the painted box in the hands is plain, so a box’s wear vanishes while it is carried. Costs nothing.'},
    {id: 'worn', name: 'Keeps its wear', what: 'Its wear laid over the painted box, held still in the room as the carried mirror’s mark is, so it never jumps when put down. One more image per frame while carrying.'},
  ]},
  {id: 'destroyed', name: 'A destroyed box', options: [
    {id: 'same', name: 'Comes back the same', what: 'As now: the rules send the same box back to its start. Costs nothing.'},
    {id: 'fresh', name: 'Comes back new', what: 'A fresh look, as from the dispenser. The game must count destructions outside the rules’ state.'},
  ]},
  {id: 'floorWear', name: 'Floor wear under elements', options: [
    {id: 'off', name: 'Kept off', what: 'As now: the floor’s marks keep off arrow, button and switch tiles.'},
    {id: 'on', name: 'Allowed', what: 'The floor’s own scratches, cracks and chips may land on those tiles too, under the element. One table entry each.'},
  ]},
  {id: 'boxLight', name: 'Room light on a box', options: [
    {id: 'follows', name: 'Follows it', what: 'Lit where it lies now: it is light, so it changes as the box moves. One look per tile a box can reach.'},
    {id: 'start', name: 'Stays with it', what: 'Lit where it started, so a box keeps one look wherever it goes.'},
  ]},
  {id: 'alike', name: 'How alike', options: [
    {id: 'own', name: 'Each its own', what: 'Every instance its own look. Memory grows with the chamber (Chamber 3: 63 instances).'},
    {id: 'pool', name: 'A pool of looks', what: 'A few looks per sprite, shared out in turn. Bounded cost; two things can look alike in a big chamber.'},
  ]},
]

const POOL_SIZES = [4, 6, 8]

/** Settings with everything off, every slider at its starting value. */
function baseSettings() {
  const settings = {
    seed: 1,
    on: {},
    amount: {},
    share: {},
    choices: {carried: 'worn', destroyed: 'same', floorWear: 'off', boxLight: 'start', alike: 'own'},
    pool: 6,
  }

  for (const layer of LAYERS) {
    settings.on[layer.key] = false
    settings.amount[layer.key] = 50
    settings.share[layer.key] = 100
  }

  return settings
}

/** Settings from a list of [layer key, strength, share]; every other layer off. */
function settingsFrom(rows, choices = {}) {
  const settings = baseSettings()

  for (const [key, amount, share] of rows) {
    settings.on[key] = true
    settings.amount[key] = amount
    settings.share[key] = share ?? 100
  }

  Object.assign(settings.choices, choices)

  return settings
}

/** Each named layer of every thing that has it, at one strength and share. */
function across(ids, amount, share, things = THINGS.map((thing) => thing.id)) {
  return LAYERS.filter((layer) => ids.includes(layer.id) && things.includes(layer.thing)).map((layer) => [layer.key, amount, share])
}

const PRESETS = [
  {id: 'original', name: 'Original', what: 'The game as it is now: every element exactly as its sprite.', make: () => settingsFrom([])},
  {id: 'pick', name: 'My pick', what: 'Tone and room light on everything, so each thing sits in the room and no two match; then fine wear on most instances, faint, kept to the plain metal and paint. No dome or mirror is touched.', make: () => settingsFrom([
    ...across(['tone'], 60, 100, ['box', 'mirror', 'button', 'switch', 'arrow', 'grate']),
    ['turntable.tone', 40],
    ...across(['light'], 50),
    ['box.edges', 35, 75], ['box.scratches', 30, 50], ['box.dents', 35, 35], ['box.disc', 30, 60],
    ['mirror.edges', 35, 75], ['mirror.scratches', 30, 50], ['mirror.dents', 35, 35],
    ['button.ring', 35, 80], ['button.scratches', 25, 50], ['button.clamps', 35, 70],
    ['switch.ring', 35, 80], ['switch.scratches', 25, 50], ['switch.clamps', 35, 70],
    ['arrow.worn', 30, 80], ['arrow.flakes', 30, 60], ['arrow.scratches', 25, 40],
    ['turntable.rings', 35, 100], ['turntable.cut', 25, 70], ['turntable.worn', 25, 70],
    ['pit.tone', 50], ['pit.streaks', 35, 70], ['pit.rim', 40, 35], ['pit.debris', 35, 40],
    ['grate.worn', 35, 60], ['grate.silt', 35, 50], ['grate.dent', 35, 30], ['grate.scratches', 30, 40],
  ])},
  {id: 'faint', name: 'Faint, everywhere', what: 'Your floor’s recipe applied to things: tone at full, every kind of wear on every instance but at 15 out of 100, barely there.', make: () => settingsFrom([
    ...across(['tone'], 100),
    ...across(['light'], 50),
    ...LAYERS.filter((layer) => (layer.type === 'wear') && !['dome', 'glass', 'dust'].includes(layer.id)).map((layer) => [layer.key, 15, 100]),
  ])},
  {id: 'bold', name: 'Bold and sparse', what: 'No tone; wear drawn clearly, on about one thing in four, so the worn ones stand out as history.', make: () => settingsFrom(LAYERS.filter((layer) => (layer.type === 'wear') && !['dome', 'glass', 'dust'].includes(layer.id)).map((layer) => [layer.key, 80, 25]))},
  {id: 'tone', name: 'Tone only', what: 'Own tone and room light, no marks at all: the cheapest look, and by the floor’s round the part you valued most.', make: () => settingsFrom([...across(['tone'], 80), ...across(['light'], 50)])},
]
