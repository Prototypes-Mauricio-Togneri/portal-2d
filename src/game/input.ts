import {FRAME_KEYS, type FrameInput} from '@/game/frame_input'
import {GameKey} from '@/game/game_key'

/**
 * Keyboard state for the game, fed by keydown and keyup on the window.
 * Tracks the game keys pressed since the last clear() and those held down;
 * every other key is ignored. Uses KeyboardEvent.keyCode, as the original
 * did, so layouts behave as they always have: letter keys follow the
 * character the layout types (falling back to US positions on non-Latin
 * layouts), while arrows, Space and Ctrl are the same everywhere.
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

  /** The game key each key stands for, by keyCode */
  private static readonly GAME_KEY_BY_KEY_CODE: Readonly<Record<number, GameKey>> = {
    [Input.UP]: GameKey.UP,
    [Input.DOWN]: GameKey.DOWN,
    [Input.LEFT]: GameKey.LEFT,
    [Input.RIGHT]: GameKey.RIGHT,
    [Input.KEY_A]: GameKey.BLUE,
    [Input.KEY_D]: GameKey.ORANGE,
    [Input.SPACE]: GameKey.INTERACT,
    [Input.CTRL]: GameKey.TURN,
  }

  enabled = true // When false, keydown is ignored entirely; keyup is still tracked
  private readonly pressing = new Set<GameKey>() // Game keys held down
  private readonly pressed = new Set<GameKey>() // Game keys pressed since the last clear(), auto-repeat included

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
   * What the rules read this frame: the keys pressed since the last clear(),
   * in the fixed order, and whether the turn key is held.
   */
  get frameInput(): FrameInput {
    return {
      keys: FRAME_KEYS.filter((key) => this.pressed.has(key)),
      turnHeld: this.pressing.has(GameKey.TURN),
    }
  }

  /**
   * Whether a game key went down since the last clear().
   * @param key - The game key
   * @returns True when it was pressed
   */
  isPressed(key: GameKey): boolean {
    return this.pressed.has(key)
  }

  /**
   * Whether a game key is held down.
   * @param key - The game key
   * @returns True when it is down
   */
  isPressing(key: GameKey): boolean {
    return this.pressing.has(key)
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

    const gameKey = Input.GAME_KEY_BY_KEY_CODE[event.keyCode]

    if (gameKey !== undefined) {
      this.pressing.add(gameKey)
      this.pressed.add(gameKey)
    }

    if (Input.GAME_KEYS.has(event.keyCode)) {
      event.preventDefault()
    }
  }

  /**
   * Records a key going up, even while disabled.
   * @param event - The keyup event
   */
  readonly onKeyup = (event: KeyboardEvent): void => {
    const gameKey = Input.GAME_KEY_BY_KEY_CODE[event.keyCode]

    if (gameKey !== undefined) {
      this.pressing.delete(gameKey)
    }

    if (this.enabled && Input.GAME_KEYS.has(event.keyCode)) {
      event.preventDefault()
    }
  }
}
