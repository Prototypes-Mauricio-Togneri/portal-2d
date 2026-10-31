/**
 * Keyboard state for the game, fed by keydown and keyup on the window.
 * Tracks the keys pressed since the last clear() and the keys held down.
 * Uses KeyboardEvent.keyCode, as the original did, so layouts behave as they
 * always have: letter keys follow the character the layout types (falling
 * back to US positions on non-Latin layouts), while arrows, Space and Ctrl
 * are the same everywhere.
 */
export class Input {
  static readonly LEFT = 37 // Left arrow
  static readonly UP = 38 // Up arrow
  static readonly RIGHT = 39 // Right arrow
  static readonly DOWN = 40 // Down arrow
  static readonly KEY_A = 65 // Shoots the blue portal
  static readonly KEY_S = 83 // Unused by the game
  static readonly KEY_D = 68 // Shoots the orange portal
  static readonly SPACE = 32 // Interact
  static readonly CTRL = 17 // Held to turn without moving

  /** Keys whose browser default (scrolling, pressing a focused button) is suppressed while enabled */
  private static readonly GAME_KEYS: ReadonlySet<number> = new Set([
    Input.LEFT,
    Input.UP,
    Input.RIGHT,
    Input.DOWN,
    Input.SPACE,
  ])

  enabled = true // When false, keydown is ignored entirely; keyup is still tracked
  private readonly pressing = new Set<number>() // Keys held down
  private readonly pressed = new Set<number>() // Keys pressed since the last clear(), auto-repeat included

  /**
   * Starts listening to the keyboard on the window.
   */
  constructor() {
    window.addEventListener('keyup', this.onKeyup, false)
    window.addEventListener('keydown', this.onKeydown, false)
  }

  /**
   * Forgets the keys pressed so far, keeping those held down.
   */
  clear(): void {
    this.pressed.clear()
  }

  /**
   * Forgets every key, pressed and held.
   */
  reset(): void {
    this.pressed.clear()
    this.pressing.clear()
  }

  /**
   * Whether a key went down since the last clear().
   * @param keyCode - The key, one of the constants on this class
   * @returns True when it was pressed
   */
  isPressed(keyCode: number): boolean {
    return this.pressed.has(keyCode)
  }

  /**
   * Whether a key is held down.
   * @param keyCode - The key, one of the constants on this class
   * @returns True when it is down
   */
  isPressing(keyCode: number): boolean {
    return this.pressing.has(keyCode)
  }

  /**
   * Stops listening to the keyboard.
   */
  dispose(): void {
    window.removeEventListener('keyup', this.onKeyup, false)
    window.removeEventListener('keydown', this.onKeydown, false)
  }

  /**
   * Records a key going down, unless disabled.
   * @param event - The keydown event
   */
  readonly onKeydown = (event: KeyboardEvent): void => {
    if (!this.enabled) {
      return
    }

    this.pressing.add(event.keyCode)
    this.pressed.add(event.keyCode)

    if (Input.GAME_KEYS.has(event.keyCode)) {
      event.preventDefault()
    }
  }

  /**
   * Records a key going up, even while disabled.
   * @param event - The keyup event
   */
  readonly onKeyup = (event: KeyboardEvent): void => {
    this.pressing.delete(event.keyCode)

    if (this.enabled && Input.GAME_KEYS.has(event.keyCode)) {
      event.preventDefault()
    }
  }
}
