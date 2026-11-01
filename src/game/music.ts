import gameMusicUrl from '@/assets/audio/music/game.mp3'
import menuMusicUrl from '@/assets/audio/music/menu.mp3'
import {createAudioPlayer} from '@/game/audio_sources'

/**
 * Background music, looping quietly under the sound effects.
 */
export class Music {
  private readonly audio: HTMLAudioElement // The element that plays the track
  private readonly volume: number // Playback volume from 0 to 1, set per track so every track sounds equally loud

  /**
   * @param url - Address of the audio file
   * @param volume - Playback volume from 0 to 1
   */
  constructor(url: string, volume: number) {
    this.audio = createAudioPlayer(url)
    this.volume = volume
  }

  /**
   * Starts or resumes the track on a loop at its volume.
   * @returns Whether the track started; false while the browser refuses to play until the user has interacted with the page
   */
  async play(): Promise<boolean> {
    this.audio.loop = true
    this.audio.volume = this.volume
    try {
      await this.audio.play()
      return true
    } catch (_error) {
      return false
    }
  }

  /**
   * Pauses the track where it is.
   */
  pause(): void {
    this.audio.pause()
  }

  /**
   * Moves the track back to its beginning, whether it is playing or paused.
   */
  rewind(): void {
    this.audio.currentTime = 0
  }
}

/**
 * Music for the home and settings screens. The file is mastered quietly, so it plays louder.
 */
export const menuMusic = new Music(menuMusicUrl, 0.19)

/**
 * Music inside a chamber. The file is mastered loudly, so it plays quieter.
 */
export const gameMusic = new Music(gameMusicUrl, 0.025)
