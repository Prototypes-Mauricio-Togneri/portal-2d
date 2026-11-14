/**
 * Every colour the game draws on its canvas by code, named by what it
 * colours: the background behind the floor and the shared drop shadow.
 * Everything else is drawn from the sprites' files, whose meaning colours are
 * listed in docs/sprites.md. The background is mirrored by hand in the CSS
 * tokens on `:root` in `src/assets/styles.css`, as its comment says: change
 * them together.
 */
export const PALETTE = {
  chamber: 'rgba(32, 32, 32, 1)', // Background behind the floor; mirrored by --color-chamber
  shadow: 'rgba(0, 0, 0, 0.5)', // The shared drop shadow under what stands raised, at its darkest
} as const
