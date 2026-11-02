/**
 * Writes a play time the way the timer shows it.
 * @param hundredths - Time in whole hundredths of a second
 * @returns Minutes, seconds and hundredths, such as "00:42.18"; minutes grow past two digits when needed
 */
export function formatTime(hundredths: number): string {
  const minutes = Math.floor(hundredths / 6000)
  const seconds = Math.floor(hundredths / 100) % 60
  const fraction = hundredths % 100
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(fraction).padStart(2, '0')}`
}
