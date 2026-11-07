/**
 * Reads a whole-number command-line option.
 * @param value - The option as typed, or undefined when absent
 * @param fallback - The value when absent
 * @param name - The option's name, for the error
 * @returns The number
 * @throws Error when the option is not a positive whole number
 */
export function readNumberOption(value: string | undefined, fallback: number, name: string): number {
  if (value === undefined) {
    return fallback
  }

  const number = Number(value)

  if ((!Number.isSafeInteger(number)) || (number < 1)) {
    throw new Error(`--${name} must be a positive whole number`)
  }

  return number
}
