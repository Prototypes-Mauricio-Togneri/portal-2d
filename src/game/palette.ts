/**
 * Every colour the game draws on its canvas by code, named by what it
 * colours: the background behind the floor, the shared drop shadow, a
 * missed shot's ripple in each portal's colour and the antlines' dots, unlit
 * and lit, each with its border. Everything else is drawn
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
} as const
