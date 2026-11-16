/**
 * Something that happened while the rules ran a frame. The rules report
 * these instead of playing sounds; Level plays the sound for each one.
 */
export type GameEvent =
  | 'bluePortalOpened'
  | 'orangePortalOpened'
  | 'refused'
  | 'boxPickedUp'
  | 'fizzled'
  | 'portalFizzled'
  | 'crossed'
  | 'doorOpened'
  | 'doorClosed'
  | 'exitOpened'
  | 'exitClosed'
  | 'buttonPressed'
  | 'buttonReleased'
  | 'switchUsed'

/**
 * Named values of GameEvent.
 */
export const GameEvent = {
  BLUE_PORTAL_OPENED: 'bluePortalOpened', // A blue portal opened on a wall
  ORANGE_PORTAL_OPENED: 'orangePortalOpened', // An orange portal opened on a wall
  REFUSED: 'refused', // A shot missed or was tried while carrying a box, a portal crossing was refused, a switch was used while carrying one, or a box was put down where another rests
  BOX_PICKED_UP: 'boxPickedUp', // The subject picked up a box
  FIZZLED: 'fizzled', // The subject entered an active fizzler, closing both portals
  PORTAL_FIZZLED: 'portalFizzled', // A fizzler turning on closed a portal on a wall side facing it
  CROSSED: 'crossed', // The subject came out of a portal
  DOOR_OPENED: 'doorOpened', // A door opened
  DOOR_CLOSED: 'doorClosed', // A door closed
  EXIT_OPENED: 'exitOpened', // The exit opened
  EXIT_CLOSED: 'exitClosed', // The exit closed
  BUTTON_PRESSED: 'buttonPressed', // A button went down
  BUTTON_RELEASED: 'buttonReleased', // A button came up
  SWITCH_USED: 'switchUsed', // The subject used a switch
} as const
