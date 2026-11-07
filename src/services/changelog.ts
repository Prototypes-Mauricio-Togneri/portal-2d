/**
 * What changed in each release of the game, newest first, shown under About
 * in the home menu.
 */

export type ChangelogRelease = {
  version: string // Release number, as in package.json when it was released
  date: string // Release day, as YYYY-MM-DD
  changes: string[] // What a player notices, one line each
}

export const CHANGELOG: ChangelogRelease[] = [
  {
    version: '0.0.4',
    date: '2026-11-07',
    changes: [
      'Change the controls under Settings',
      'Keys keep their place on every keyboard layout: on AZERTY, the blue portal is Q and undo is W',
      'Keys pressed together all count, in the order pressed',
      'Moving with the numpad now needs its keys bound under Settings',
    ],
  },
  {
    version: '0.0.3',
    date: '2026-11-06',
    changes: ['Undo and redo every step (Z and X)'],
  },
  {
    version: '0.0.2',
    date: '2026-11-06',
    changes: ['Chambers are sharp on high-resolution screens'],
  },
  {
    version: '0.0.1',
    date: '2026-11-01',
    changes: [
      'Three test chambers to cross with a pair of portals',
      'Boxes, buttons, switches, doors, barriers, ditches, fizzlers, lasers and arrows',
      'A map of each chamber in the menu',
      'Escape pauses, to continue, reset or exit the chamber',
      'Completed chambers are remembered until you reset progress',
      'Switches for sound effects and music',
      'About, with more games, this changelog, the original game and feedback',
    ],
  },
]
