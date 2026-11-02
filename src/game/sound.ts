import boxUrl from '@/assets/audio/sound/box.mp3'
import {createAudioPlayer} from '@/game/audio_sources'
import buttonOffUrl from '@/assets/audio/sound/button_off.mp3'
import buttonOnUrl from '@/assets/audio/sound/button_on.mp3'
import crossUrl from '@/assets/audio/sound/cross.mp3'
import doorCloseUrl from '@/assets/audio/sound/door_close.mp3'
import doorOpenUrl from '@/assets/audio/sound/door_open.mp3'
import errorUrl from '@/assets/audio/sound/error.mp3'
import fizzlerUrl from '@/assets/audio/sound/fizzler.mp3'
import menuButtonUrl from '@/assets/audio/sound/menu_button.mp3'
import portalBlueUrl from '@/assets/audio/sound/portal_blue.mp3'
import portalOrangeUrl from '@/assets/audio/sound/portal_orange.mp3'
import startUrl from '@/assets/audio/sound/start.mp3'
import switchUrl from '@/assets/audio/sound/switch.mp3'

/**
 * A sound effect. Each effect is a single shared instance that restarts from
 * the beginning every time it plays, cutting itself off if still playing.
 */
export class Sound {
  static enabled = true // When false, play() does nothing

  static readonly PORTAL_BLUE = new Sound(portalBlueUrl, 0.27) // Blue portal opened
  static readonly PORTAL_ORANGE = new Sound(portalOrangeUrl, 0.24) // Orange portal opened
  static readonly BUTTON_ON = new Sound(buttonOnUrl, 0.27) // Button pressed down
  static readonly BUTTON_OFF = new Sound(buttonOffUrl, 0.56) // Button released
  static readonly BOX = new Sound(boxUrl, 0.05) // Box picked up
  static readonly FIZZLER = new Sound(fizzlerUrl, 0.27) // Subject entered an active fizzler
  static readonly CROSS = new Sound(crossUrl, 0.35) // Subject went through a portal
  static readonly DOOR_OPEN = new Sound(doorOpenUrl, 0.15) // Door or exit opened
  static readonly DOOR_CLOSE = new Sound(doorCloseUrl, 0.15) // Door or exit closed
  static readonly ERROR = new Sound(errorUrl, 0.13) // Action refused
  static readonly SWITCH = new Sound(switchUrl, 0.72) // Switch used
  static readonly MENU_BUTTON = new Sound(menuButtonUrl, 0.17) // Menu or dialog button pressed, setting changed or pause menu opened; played by the screens, not the game
  static readonly START = new Sound(startUrl, 0.31) // Chamber picked on the home screen; played by the screens, not the game

  private readonly audio: HTMLAudioElement // The element that plays this effect

  /**
   * @param url - Address of the audio file
   * @param volume - Playback volume from 0 to 1, set per effect so every effect sounds about equally loud, a little above the music
   */
  constructor(url: string, volume: number) {
    this.audio = createAudioPlayer(url)
    this.audio.volume = volume
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
