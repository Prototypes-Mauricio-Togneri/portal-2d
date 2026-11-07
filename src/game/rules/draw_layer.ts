/**
 * Where something is drawn, back to front, in the original game's drawing order: the
 * floor, the arrows, the walls, the blockers (barriers, ditches, lasers,
 * doors and the exit), the portals, the buttons and switches, the boxes, the
 * subject, then the fizzlers over everything. The core step draws the floor,
 * the portals and the subject; inside a layer, elements are drawn in the
 * element registry's order. No two elements of one layer start on the same
 * tile (the validator allows one fixed element per floor tile), except two
 * crossing lasers.
 */
export const DRAW_LAYERS = [
  'floor',
  'floorMarks',
  'structure',
  'blockers',
  'portals',
  'fixtures',
  'items',
  'subject',
  'fields',
] as const

/**
 * One of the layers things are drawn on, from DRAW_LAYERS.
 */
export type DrawLayer = (typeof DRAW_LAYERS)[number]
