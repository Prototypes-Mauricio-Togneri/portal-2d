/**
 * The game's audio players, grouped by the address of the file each one plays.
 * A player downloads nothing on its own until it first plays, so the app can
 * hand it a copy of the file it has already downloaded instead (useAudioFile).
 */

const playersByUrl = new Map<string, HTMLAudioElement[]>() // Every player created so far, by the address of its file

/**
 * Creates an audio player for a file without downloading it yet. Unless the app
 * hands over a copy first, the player fetches the file when it first plays.
 * @param url - Address of the audio file
 * @returns The new player
 */
export function createAudioPlayer(url: string): HTMLAudioElement {
  const audio = new Audio(url)
  audio.preload = 'none'
  playersByUrl.set(url, [
    ...playersByUrl.get(url) ?? [],
    audio,
  ])
  return audio
}

/**
 * Points every player of a file at a copy of it, and has them load it right away
 * so they are ready before they first play.
 * @param url - Address of the audio file, as the players were created with
 * @param source - Address of the copy, such as an object URL for a downloaded file
 */
export function useAudioFile(url: string, source: string): void {
  for (const audio of playersByUrl.get(url) ?? []) {
    // Source first: turning preloading on while the player still points at the file would start downloading it
    audio.src = source
    audio.preload = 'auto'
  }
}
