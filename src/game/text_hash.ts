/** FNV-1a 32-bit offset basis */
const FNV_OFFSET_BASIS = 0x811c9dc5

/** FNV-1a 32-bit prime */
const FNV_PRIME = 0x01000193

/** Turns text into the UTF-8 bytes that are hashed */
const TEXT_ENCODER = new TextEncoder()

/**
 * The 32-bit FNV-1a hash of a list of bytes.
 * @param bytes - The bytes to hash
 * @returns The hash, as an unsigned 32-bit integer
 */
export function hashBytes(bytes: Uint8Array): number {
  let hash = FNV_OFFSET_BASIS

  for (const byte of bytes) {
    hash ^= byte
    hash = Math.imul(hash, FNV_PRIME)
  }

  return hash >>> 0
}

/**
 * The 32-bit FNV-1a hash of a text, over its UTF-8 bytes.
 * @param text - The text to hash
 * @returns The hash, as an unsigned 32-bit integer
 */
export function hashText(text: string): number {
  return hashBytes(TEXT_ENCODER.encode(text))
}

/**
 * Writes a 32-bit hash the way replays and the engine scripts show it.
 * @param hash - An unsigned 32-bit integer
 * @returns Eight lowercase hexadecimal digits
 */
export function formatHash(hash: number): string {
  return hash.toString(16).padStart(8, '0')
}
