/**
 * Every colour the game draws on its canvas, named by what it colours. The
 * original game's colours, unchanged; the drawing stays frozen until stage 03
 * reworks it. Some are mirrored by hand in the CSS tokens on `:root` in
 * `src/assets/styles.css`, as each entry's comment says: change both together.
 */
export const PALETTE = {
  chamber: 'rgba(32, 32, 32, 1)', // Background behind the floor; mirrored by --color-chamber
  floorFill: 'rgba(240, 240, 240, 1)', // A floor tile
  floorBorder: 'rgba(130, 130, 130, 1)', // A floor tile's edge
  subjectFill: 'rgba(0, 160, 100, 1)', // The subject's body; --color-subject is a lighter shade on purpose
  subjectBorder: 'rgba(130, 130, 130, 1)', // The subject's edge
  subjectArrow: 'rgba(255, 255, 255, 1)', // The subject's facing triangle while it carries no box; mirrored by --color-white
  bluePortalFill: 'rgba(40, 140, 220, 1)', // The blue portal's body; mirrored by --color-blue
  bluePortalBorder: 'rgba(34, 122, 191, 1)', // The blue portal's edge
  orangePortalFill: 'rgba(255, 160, 30, 1)', // The orange portal's body; mirrored by --color-orange
  orangePortalBorder: 'rgba(209, 128, 17, 1)', // The orange portal's edge
  wallFill: 'rgba(156, 156, 156, 1)', // A wall tile
  wallBorder: 'rgba(60, 60, 60, 1)', // A wall tile's edge
  doorFill: 'rgba(163, 80, 135, 1)', // A door, and the exit, while closed
  doorBorder: 'rgba(179, 4, 179, 1)', // A closed door's or exit's edge
  buttonFill: 'rgba(220, 60, 50, 1)', // A floor button; mirrored by --color-red
  buttonBorder: 'rgba(186, 51, 43, 1)', // A floor button's edge; mirrored by --color-red-deep
  switchFill: 'rgba(242, 122, 34, 1)', // A switch
  switchBorder: 'rgba(181, 42, 42, 1)', // A switch's edge
  boxFill: 'rgba(190, 120, 90, 1)', // A box, and the subject's facing triangle while it carries one
  boxBorder: 'rgba(143, 91, 69, 1)', // A box's edge
  fizzlerFill: 'rgba(104, 125, 179, 1)', // A fizzler that is on, drawn at half opacity
  fizzlerBorder: 'rgba(73, 73, 227, 1)', // A fizzler's edge
  arrow: 'rgba(140, 140, 140, 1)', // An arrow's triangle
  barrierCenter: 'rgba(184, 184, 184, 1)', // A raised barrier's gradient at its centre, the lighter end
  barrierEdge: 'rgba(64, 64, 64, 1)', // A raised barrier's gradient at its edge, the darker end
  ditch: 'rgba(48, 48, 48, 1)', // An open ditch
  laser: 'rgba(252, 25, 150, 1)', // A laser beam that is on
} as const
