/**
 * A JSON object as read from a file, before its fields are checked.
 */
export type JsonObject = Readonly<Record<string, unknown>>

/**
 * Whether a parsed JSON value is an object, as opposed to a list, a plain
 * value or null.
 * @param value - The value to test
 * @returns True for an object
 */
export function isJsonObject(value: unknown): value is JsonObject {
  return (typeof value === 'object') && (value !== null) && (!Array.isArray(value))
}
