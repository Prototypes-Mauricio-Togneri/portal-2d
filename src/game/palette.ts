/**
 * Every colour the game draws on its canvas by code, named by what it
 * colours: the background behind the floor, the shared drop shadow, a
 * missed shot's ripple in each portal's colour, the antlines' dots, unlit
 * and lit, each with its border, an emitter's ray, from its dark rim to its
 * white-hot core, and the mirror marked on a carried mirror box. Everything
 * else is drawn
 * from the sprites' files, whose meaning colours are listed in
 * docs/sprites.md. The background and the portals' colours are mirrored by
 * hand in the CSS tokens on `:root` in `src/assets/styles.css`, and the
 * portals' colours in the sprites too, as their comments say: change them
 * together.
 */
export const PALETTE = {
  chamber: 'rgba(32, 32, 32, 1)', // Background behind the floor; mirrored by --color-chamber
  shadow: 'rgba(0, 0, 0, 0.5)', // The shared drop shadow under what stands raised, at its darkest
  missBlue: 'rgba(40, 140, 220, 1)', // A missed blue shot's ripple: the blue portal's meaning colour (docs/sprites.md); mirrored by --color-blue
  missOrange: 'rgba(255, 160, 30, 1)', // A missed orange shot's ripple: the orange portal's meaning colour (docs/sprites.md); mirrored by --color-orange
  antlineOff: 'rgba(72, 176, 185, 1)', // An unlit antline's dots: muted cyan, clear of the blue portal and the light barrier's teal (docs/sprites.md)
  antlineOffBorder: 'rgba(50, 123, 130, 1)', // Their border, 30 % darker
  antlineOn: 'rgba(250, 194, 44, 1)', // A lit antline's dots: amber, yellower than the orange portal (docs/sprites.md)
  antlineOnBorder: 'rgba(175, 136, 31, 1)', // Their border, 30 % darker
  rayBody: 'rgba(255, 228, 112, 1)', // An emitter's ray: pale gold, its beam's body, its haze and its glow (docs/sprites.md)
  rayLight: 'rgba(255, 242, 186, 1)', // The ray's beam lightening towards its middle
  rayCore: 'rgba(255, 252, 236, 1)', // The ray's white-hot core
  rayRim: 'rgba(186, 148, 30, 1)', // The ray's dark rim and soft edge, so pale gold shows on the light floor
  carriedMirrorFrame: 'rgba(44, 48, 54, 1)', // A carried mirror box's mirror, drawn over the box in the subject's hands: its dark frame
  carriedMirrorGlass: 'rgba(226, 231, 238, 1)', // Its glass
  carriedMirrorGlint: 'rgba(255, 255, 255, 1)', // The glint along it
} as const
