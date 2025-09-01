import { createHash } from 'crypto'
import { SHA256Hash } from '../registries/SchemaRegistry'

/**
 * Recursively canonicalizes a value:
 * - Primitives are returned as-is.
 * - Arrays are mapped through canonicalize.
 * - Plain objects have their keys sorted and values canonicalized.
 */
function canonicalize(value: any): any {
  if (value === null || typeof value !== 'object') {
    // primitives (string, number, boolean, null)
    return value
  }

  if (Array.isArray(value)) {
    // arrays: preserve order, but canonicalize each element
    return value.map(canonicalize)
  }

  // plain object: sort keys
  const sortedKeys = Object.keys(value).sort()
  const result: Record<string, any> = {}
  for (const key of sortedKeys) {
    result[key] = canonicalize(value[key])
  }
  return result
}

/**
 * Produces a deterministic SHA-256 hash of any JSON-like object,
 * ignoring original property order.
 *
 * @param obj - The JSON-serializable input.
 * @returns A hex string of the SHA-256 hash.
 */
export function contentHash(obj: any): SHA256Hash {
  // 1. Canonicalize
  const canon = canonicalize(obj)

  // 2. Stringify (no extra spaces)
  const json = JSON.stringify(canon)

  // 3. Hash
  return createHash('sha256').update(json, 'utf8').digest('hex')
}
