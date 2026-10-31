import musicUrl from '@/assets/audio/music/music.mp3'

/**
 * Background music, looping quietly under the sound effects.
 */
export class Music {
  private readonly audio: HTMLAudioElement // The element that plays the track

  /**
   * @param url - Address of the audio file
   */
  constructor(url: string) {
    this.audio = new Audio(url)
  }

  /**
   * Starts or resumes the track on a loop at low volume.
   */
  play(): void {
    this.audio.loop = true
    this.audio.volume = 0.05
    this.audio.play().catch(() => {
      // The browser refuses to play until the user has interacted with the page
    })
  }

  /**
   * Pauses the track where it is.
   */
  pause(): void {
    this.audio.pause()
  }
}

/**
 * The single background music instance.
 */
export const music = new Music(musicUrl)
