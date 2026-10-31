/**
 * Sound and music preferences, kept in localStorage and applied to the game audio.
 */
import {ref, watch} from 'vue'
import {music} from '@/game/music'
import {Sound} from '@/game/sound'

const SOUND_STORAGE_KEY = 'portal-2d.sound-enabled'
const MUSIC_STORAGE_KEY = 'portal-2d.music-enabled'

let musicStarted = false // Music waits for the first chamber, then loops on every screen

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
 * Plays or pauses the music to match the preference.
 * Safe to call repeatedly; playing music that is already playing is a no-op.
 */
function applyMusic(): void {
  if (musicStarted && musicEnabled.value) {
    music.play()
  } else {
    music.pause()
  }
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
 * Starts the music when the first chamber opens.
 * Browsers block audio until the page gets a key press or click, so after a
 * reload straight into a chamber the music retries on the next one.
 */
export function startMusic(): void {
  musicStarted = true
  applyMusic()
  window.addEventListener('keydown', applyMusic, {
    once: true,
  })
  window.addEventListener('pointerdown', applyMusic, {
    once: true,
  })
}
