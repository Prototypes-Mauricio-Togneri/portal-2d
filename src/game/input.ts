import type {FrameInput, FrameKey} from '@/game/frame_input'
import {GameKey, type HistoryKey} from '@/game/game_key'
import {type BoundKey, getBoundKey, type KeyBindings} from '@/game/key_bindings'

/**
 * A press waiting for the level, with whether the turn key was held as it
 * went down.
 */
type KeyPress = {
  readonly key: FrameKey | HistoryKey // The game key pressed
  readonly turnHeld: boolean // Whether the turn key was held down at that moment
}

/**
 * Keyboard state for the game, fed by keydown and keyup on the window. Keys
 * are read by physical position (KeyboardEvent.code) through the player's
 * bindings, so they stay in place on every layout; every other key is
 * ignored. Presses wait in arrival order until the level takes them, one at a
 * time; the turn key is only ever read as held.
 */
export class Input {
  /**
   * Keys whose browser default (scrolling, pressing a focused button,
   * Firefox's quick find) is suppressed while enabled, when they are bound
   */
  private static readonly KEYS_WITH_DEFAULTS: ReadonlySet<string> = new Set([
    'ArrowUp',
    'ArrowDown',
    'ArrowLeft',
    'ArrowRight',
    'Space',
    'PageUp',
    'PageDown',
    'Home',
    'End',
    'Enter',
    'NumpadEnter',
    'Slash',
    'Quote',
  ])

  /**
   * Characters that open Firefox's quick find, whichever key types them on
   * the player's layout, suppressed while enabled when their key is bound
   */
  private static readonly QUICK_FIND_CHARACTERS: ReadonlySet<string> = new Set([
    '/',
    '\'',
  ])

  enabled = true // When false, keydown is ignored entirely; keyup is still tracked
  private readonly gameKeys: ReadonlyMap<BoundKey, GameKey> // The game key each bound key stands for
  private readonly holding = new Set<GameKey>() // Game keys held down
  private readonly pressed = new Set<GameKey>() // Game keys pressed since the last clear(), auto-repeat included
  private readonly presses: KeyPress[] = [] // Presses not yet taken, oldest first

  /**
   * Starts listening to the keyboard on the window.
   * @param bindings - The key bound to each game key, which is only read
   */
  constructor(bindings: KeyBindings) {
    this.gameKeys = new Map(Object.values(GameKey).map((gameKey) => [
      bindings[gameKey],
      gameKey,
    ]))

    window.addEventListener('keyup', this.onKeyup, false)
    window.addEventListener('keydown', this.onKeydown, false)
  }

  /**
   * Forgets which keys went down since the last call, keeping the presses
   * still waiting and the keys held down.
   */
  clear(): void {
    this.pressed.clear()
  }

  /**
   * Forgets every key: pressed, waiting and held.
   */
  reset(): void {
    this.pressed.clear()
    this.presses.length = 0
    this.holding.clear()
  }

  /**
   * Takes the oldest waiting press.
   * @returns What the rules read for it (its key, and whether the turn key
   * was held as it went down), the undo or redo pressed, or null when no
   * press is waiting
   */
  takePress(): FrameInput | HistoryKey | null {
    const press = this.presses.shift()

    if (press === undefined) {
      return null
    }

    if ((press.key === GameKey.UNDO) || (press.key === GameKey.REDO)) {
      return press.key
    }

    return {
      keys: [press.key],
      turnHeld: press.turnHeld,
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
   * Stops listening to the keyboard.
   */
  dispose(): void {
    window.removeEventListener('keyup', this.onKeyup, false)
    window.removeEventListener('keydown', this.onKeydown, false)
  }

  /**
   * Records a key going down, unless disabled. A press waits for the level,
   * except a held key's repeat while its earlier press is still waiting, and
   * a press with Alt or Meta held, which is only recorded as held.
   * @param event - The keydown event
   */
  readonly onKeydown = (event: KeyboardEvent): void => {
    if (!this.enabled) {
      return
    }

    const gameKey = this.getGameKey(event)

    if (gameKey === null) {
      return
    }

    this.holding.add(gameKey)

    // With Alt or Meta held the key is a browser shortcut (Alt+Left goes
    // back), so it is left to the browser and doesn't play
    if (event.altKey || event.metaKey) {
      return
    }

    this.pressed.add(gameKey)

    if ((gameKey !== GameKey.TURN) && !(event.repeat && this.presses.some((press) => press.key === gameKey))) {
      this.presses.push({
        key: gameKey,
        turnHeld: this.holding.has(GameKey.TURN),
      })
    }

    this.preventDefault(event)
  }

  /**
   * Records a key going up, even while disabled.
   * @param event - The keyup event
   */
  readonly onKeyup = (event: KeyboardEvent): void => {
    const gameKey = this.getGameKey(event)

    if (gameKey === null) {
      return
    }

    this.holding.delete(gameKey)

    if (this.enabled) {
      this.preventDefault(event)
    }
  }

  /**
   * The game key a keyboard event's key is bound to.
   * @param event - The keyboard event
   * @returns The game key, or null when the key is not bound
   */
  private getGameKey(event: KeyboardEvent): GameKey | null {
    const key = getBoundKey(event.code)

    return (key === null) ? null : (this.gameKeys.get(key) ?? null)
  }

  /**
   * Suppresses a bound key's browser default, such as scrolling, unless Alt
   * or Meta is held, which leaves the combination to the browser.
   * @param event - The keyboard event of a bound key
   */
  private preventDefault(event: KeyboardEvent): void {
    const hasDefault = Input.KEYS_WITH_DEFAULTS.has(event.code) || Input.QUICK_FIND_CHARACTERS.has(event.key)

    if (hasDefault && !event.altKey && !event.metaKey) {
      event.preventDefault()
    }
  }
}
