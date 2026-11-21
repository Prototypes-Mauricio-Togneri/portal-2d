/**
 * Something that happened while the rules ran a frame. The rules report
 * these instead of playing sounds; Level plays the sound for each one.
 */
export type GameEvent =
  | 'bluePortalOpened'
  | 'orangePortalOpened'
  | 'refused'
  | 'boxPickedUp'
  | 'boxPutDown'
  | 'boxDestroyed'
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
  | 'slideStarted'
  | 'slideStopped'
  | 'arrowTurned'
  | 'blockedWallSwitched'
  | 'ditchSwitched'
  | 'lightBarrierSwitchedOff'
  | 'lightBarrierSwitchedOn'
  | 'laserSwitchedOff'
  | 'laserSwitchedOn'
  | 'fizzlerSwitchedOff'
  | 'fizzlerSwitchedOn'
  | 'receiverLit'
  | 'receiverUnlit'

/**
 * Named values of GameEvent.
 */
export const GameEvent = {
  BLUE_PORTAL_OPENED: 'bluePortalOpened', // A blue portal opened on a wall
  ORANGE_PORTAL_OPENED: 'orangePortalOpened', // An orange portal opened on a wall
  REFUSED: 'refused', // A shot missed or was tried while carrying a box, a portal crossing was refused, a switch was used while carrying one, or a box was put down facing a tile that can't take it
  BOX_PICKED_UP: 'boxPickedUp', // The subject picked up a box
  BOX_PUT_DOWN: 'boxPutDown', // The subject put down the box it carried
  BOX_DESTROYED: 'boxDestroyed', // A box lying where a door closed, a ditch opened, or a laser, a light barrier or a fizzler switched on went back to its start
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
  SLIDE_STARTED: 'slideStarted', // The subject, having entered a slide floor, slid on from it
  SLIDE_STOPPED: 'slideStopped', // A slide that started ended
  ARROW_TURNED: 'arrowTurned', // An arrow turned, by a link, to its turned way or back
  BLOCKED_WALL_SWITCHED: 'blockedWallSwitched', // A blocked wall switched, by a link, to take portals or to refuse them
  DITCH_SWITCHED: 'ditchSwitched', // A ditch switched, by a link, to be bridged or to open
  LIGHT_BARRIER_SWITCHED_OFF: 'lightBarrierSwitchedOff', // A light barrier switched off, by a link
  LIGHT_BARRIER_SWITCHED_ON: 'lightBarrierSwitchedOn', // A light barrier switched on, by a link
  LASER_SWITCHED_OFF: 'laserSwitchedOff', // A laser switched off, by a link
  LASER_SWITCHED_ON: 'laserSwitchedOn', // A laser switched on, by a link
  FIZZLER_SWITCHED_OFF: 'fizzlerSwitchedOff', // A fizzler switched off, by a link
  FIZZLER_SWITCHED_ON: 'fizzlerSwitchedOn', // A fizzler switched on, by a link
  RECEIVER_LIT: 'receiverLit', // A ray reached a receiver, which acts on its links as a button going down
  RECEIVER_UNLIT: 'receiverUnlit', // A receiver no ray reaches any more went dark, which acts on its links as a button coming up
} as const
