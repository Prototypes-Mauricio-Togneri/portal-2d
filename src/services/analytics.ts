/**
 * Firebase Analytics: what players do in the chambers, the settings and About.
 * Only production builds send anything, and analytics never affects the game:
 * a browser that can't run it, an ad blocker or any error just means the
 * events are dropped.
 */
import {getAnalytics, isSupported, logEvent} from 'firebase/analytics'
import type {Analytics} from 'firebase/analytics'
import {initializeApp} from 'firebase/app'
import type {FirebaseOptions} from 'firebase/app'
import type {ChamberEntry} from '@/services/chamber_catalogue'

/** The events sent, named as they appear in the Firebase console. */
type EventName =
  | 'chamber_start'
  | 'chamber_restart'
  | 'chamber_quit'
  | 'chamber_complete'
  | 'setting_change'
  | 'progress_reset'
  | 'changelog_open'
  | 'feedback_open'
  | 'link_open'

/** An event's details, by parameter name. */
type EventParams = Record<string, string | number>

/** A setting the player can switch under Settings. */
export type TrackedSetting = 'sound' | 'music'

/** How far a run got when it ended. */
export type RunProgress = {
  hundredths: number // The run's time as shown to the player, in hundredths of a second
  moves: number // Tiles the subject stepped onto
}

// Only what Analytics needs: it fetches the measurement ID from Firebase on start
const FIREBASE_CONFIG: FirebaseOptions = {
  apiKey: 'AIzaSyDSkTfVrkuiVgvYridxb4HBARgU2QrFjrw', // Identifies the web app to Firebase; public by design
  projectId: 'portal-2d', // The Firebase project
  appId: '1:218230651857:web:96e0c9555b2bc28a26bef0', // The web app within the project
}

let analytics: Promise<Analytics | null> = Promise.resolve(null) // The running instance, or null while nothing is sent

/**
 * Starts sending events, in production builds only and only where the browser
 * supports Analytics. Call once, when the app starts.
 */
export function startAnalytics(): void {
  if (!import.meta.env.PROD) {
    return
  }
  analytics = isSupported()
    .then((supported) => (supported ? getAnalytics(initializeApp(FIREBASE_CONFIG)) : null))
    .catch(() => null)
}

/**
 * Sends one event once Analytics has started; drops it when nothing is sent.
 * @param name - The event
 * @param params - Its details
 */
function sendEvent(name: EventName, params: EventParams = {}): void {
  void analytics
    .then((instance) => {
      if (instance !== null) {
        logEvent(instance, name, params)
      }
    })
    .catch(() => {
      // Analytics failed: the event is dropped and the game goes on
    })
}

/**
 * Names a chamber in an event's details.
 * @param chamber - The chamber
 * @returns Its permanent id and the number the player sees
 */
function chamberParams(chamber: ChamberEntry): EventParams {
  return {
    chamber_id: chamber.id,
    chamber_number: chamber.number,
  }
}

/**
 * Describes how far a run got in an event's details.
 * @param progress - The run
 * @returns Its time in milliseconds and its moves
 */
function progressParams(progress: RunProgress): EventParams {
  return {
    time_ms: progress.hundredths * 10,
    moves: progress.moves,
  }
}

/**
 * A run of a chamber begins: the chamber was opened, or played again after finishing it.
 * @param chamber - The chamber
 */
export function trackChamberStart(chamber: ChamberEntry): void {
  sendEvent('chamber_start', chamberParams(chamber))
}

/**
 * The player confirmed Reset chamber, ending the run.
 * @param chamber - The chamber
 * @param progress - How far the run got before the reset
 */
export function trackChamberRestart(chamber: ChamberEntry, progress: RunProgress): void {
  sendEvent('chamber_restart', {
    ...chamberParams(chamber),
    ...progressParams(progress),
  })
}

/**
 * The player confirmed leaving the chamber before finishing it.
 * @param chamber - The chamber
 * @param progress - How far the run got
 */
export function trackChamberQuit(chamber: ChamberEntry, progress: RunProgress): void {
  sendEvent('chamber_quit', {
    ...chamberParams(chamber),
    ...progressParams(progress),
  })
}

/**
 * The subject reached the exit.
 * @param chamber - The chamber
 * @param progress - The finished run
 * @param portals - Portals opened on a wall during the run, misses not counted
 */
export function trackChamberComplete(chamber: ChamberEntry, progress: RunProgress, portals: number): void {
  sendEvent('chamber_complete', {
    ...chamberParams(chamber),
    ...progressParams(progress),
    portals: portals,
  })
}

/**
 * The player switched a setting.
 * @param setting - Which setting
 * @param enabled - Its new value
 */
export function trackSettingChange(setting: TrackedSetting, enabled: boolean): void {
  sendEvent('setting_change', {
    setting: setting,
    enabled: enabled ? 'on' : 'off',
  })
}

/**
 * The player confirmed Reset progress.
 */
export function trackProgressReset(): void {
  sendEvent('progress_reset')
}

/**
 * The player stepped into the changelog under About.
 */
export function trackChangelogOpen(): void {
  sendEvent('changelog_open')
}

/**
 * The player picked Feedback under About, opening their mail app.
 */
export function trackFeedbackOpen(): void {
  sendEvent('feedback_open')
}

/**
 * The player opened a page listed under About.
 * @param label - The page's name on its row
 * @param url - Its address
 */
export function trackLinkOpen(label: string, url: string): void {
  sendEvent('link_open', {
    link: label,
    url: url,
  })
}
