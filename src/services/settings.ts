/**
 * Sound and music preferences, kept in localStorage and applied to the game audio.
 */
import {ref, watch} from 'vue'
import {gameMusic, menuMusic} from '@/game/music'
import type {Music} from '@/game/music'
import {Sound} from '@/game/sound'

/** Which background track a screen plays. */
export type MusicTrack = 'menu' | 'game'

const SOUND_STORAGE_KEY = 'portal-2d.sound-enabled'
const MUSIC_STORAGE_KEY = 'portal-2d.music-enabled'

const MUSIC_TRACKS: Record<MusicTrack, Music> = {
  menu: menuMusic,
  game: gameMusic,
}

let currentTrack: MusicTrack | null = null // Track of the open screen; none until a screen opens

/**
 * Reads an on/off preference. Missing or unreadable values count as on.
 * @param key - localStorage key
 * @returns The stored preference
 */
function readPreference(key: string): boolean {
  try {
    return localStorage.getItem(key) !== 'false'
  } catch (_error) {
    return true
  }
}

/**
 * Persists an on/off preference.
 * @param key - localStorage key
 * @param value - Preference to store
 */
function writePreference(key: string, value: boolean): void {
  try {
    localStorage.setItem(key, String(value))
  } catch (_error) {
    // Storage blocked: the preference lasts for this visit only
  }
}

/**
 * Plays the open screen's track if music is on, and pauses every other track.
 * Safe to call repeatedly; playing music that is already playing is a no-op.
 */
function applyMusic(): void {
  const playingMusic = musicEnabled.value && currentTrack !== null ? MUSIC_TRACKS[currentTrack] : null
  for (const music of Object.values(MUSIC_TRACKS)) {
    if (music === playingMusic) {
      void music.play().then((started) => {
        if (started) {
          stopRetryingMusic()
        }
      })
    } else {
      music.pause()
    }
  }
}

/**
 * Stops retrying the music on key presses and clicks, once a track has started.
 */
function stopRetryingMusic(): void {
  window.removeEventListener('keydown', applyMusic)
  window.removeEventListener('pointerdown', applyMusic)
}

export const soundEnabled = ref(readPreference(SOUND_STORAGE_KEY))
export const musicEnabled = ref(readPreference(MUSIC_STORAGE_KEY))

Sound.enabled = soundEnabled.value

watch(soundEnabled, (enabled) => {
  Sound.enabled = enabled
  writePreference(SOUND_STORAGE_KEY, enabled)
})

watch(musicEnabled, (enabled) => {
  writePreference(MUSIC_STORAGE_KEY, enabled)
  applyMusic()
})

/**
 * Switches the background music to a screen's track, which loops while the
 * screen is open and resumes where it left off when the screen opens again.
 * Browsers block audio until the page gets a key press or click, so on a fresh
 * visit every key press and click retries the track until it starts; some keys,
 * such as Escape, don't count as interacting with the page.
 * @param track - The track the opening screen plays
 */
export function playMusic(track: MusicTrack): void {
  currentTrack = track
  applyMusic()
  window.addEventListener('keydown', applyMusic)
  window.addEventListener('pointerdown', applyMusic)
}
