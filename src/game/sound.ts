import boxUrl from '@/assets/audio/sound/box.mp3'
import buttonOffUrl from '@/assets/audio/sound/button_off.mp3'
import buttonOnUrl from '@/assets/audio/sound/button_on.mp3'
import crossUrl from '@/assets/audio/sound/cross.mp3'
import doorCloseUrl from '@/assets/audio/sound/door_close.mp3'
import doorOpenUrl from '@/assets/audio/sound/door_open.mp3'
import errorUrl from '@/assets/audio/sound/error.mp3'
import fizzlerUrl from '@/assets/audio/sound/fizzler.mp3'
import portalBlueUrl from '@/assets/audio/sound/portal_blue.mp3'
import portalOrangeUrl from '@/assets/audio/sound/portal_orange.mp3'
import switchUrl from '@/assets/audio/sound/switch.mp3'

/**
 * A sound effect. Each effect is a single shared instance that restarts from
 * the beginning every time it plays, cutting itself off if still playing.
 */
export class Sound {
  static enabled = true // When false, play() does nothing

  static readonly PORTAL_BLUE = new Sound(portalBlueUrl) // Blue portal opened
  static readonly PORTAL_ORANGE = new Sound(portalOrangeUrl) // Orange portal opened
  static readonly BUTTON_ON = new Sound(buttonOnUrl) // Button pressed down
  static readonly BUTTON_OFF = new Sound(buttonOffUrl) // Button released
  static readonly BOX = new Sound(boxUrl) // Box picked up
  static readonly FIZZLER = new Sound(fizzlerUrl) // Subject entered an active fizzler
  static readonly CROSS = new Sound(crossUrl) // Subject went through a portal
  static readonly DOOR_OPEN = new Sound(doorOpenUrl) // Door or exit opened
  static readonly DOOR_CLOSE = new Sound(doorCloseUrl) // Door or exit closed
  static readonly ERROR = new Sound(errorUrl) // Action refused
  static readonly SWITCH = new Sound(switchUrl) // Switch used

  private readonly audio: HTMLAudioElement // The element that plays this effect

  /**
   * @param url - Address of the audio file
   */
  constructor(url: string) {
    this.audio = new Audio(url)
  }

  /**
   * Plays the effect from the start, unless sounds are disabled.
   */
  play(): void {
    if (!Sound.enabled) {
      return
    }

    this.audio.pause()
    this.audio.currentTime = 0
    this.audio.play().catch(() => {
      // The browser refuses to play until the user has interacted with the page
    })
  }
}
