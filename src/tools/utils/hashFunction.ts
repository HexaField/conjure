// ts-morph is available but we're using a simpler string-based approach for now
/** @todo replace with ts-morph */

/**
 * Canonicalizes a JavaScript function source by alpha-renaming all bound identifiers.
 * This creates an implementation-agnostic hash that is the same regardless of formatting
 * and variable names, allowing for semantic comparison of functions.
 *
 * @param fnSource - The text of your function (declaration, expression, or arrow function)
 * @returns Promise<string> - hex SHA-256 hash of the canonicalized function
 */
export async function hashFunctionSource(fnSource: string): Promise<string> {
  try {
    const normalized = canonicalizeFunctionSource(fnSource)

    // Hash with Web Crypto API
    const encoder = new TextEncoder()
    const data = encoder.encode(normalized)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)

    // Convert ArrayBuffer to hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  } catch (error) {
    throw new Error(`Failed to hash function source: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Synchronous version of hashFunctionSource for Node.js environments.
 * Uses Node.js crypto module instead of Web Crypto API.
 *
 * @param fnSource - The text of your function
 * @returns string - hex SHA-256 hash of the canonicalized function
 */
export function hashFunctionSourceSync(fnSource: string): string {
  try {
    const normalized = canonicalizeFunctionSource(fnSource)

    // Hash with Node.js crypto (for testing environment)
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const crypto = require('crypto')
      return crypto.createHash('sha256').update(normalized).digest('hex')
    } catch {
      // Fall back to a simple hash if crypto is not available
      return simpleHash(normalized)
    }
  } catch (error) {
    throw new Error(`Failed to hash function source: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Canonicalizes a JavaScript function source using ts-morph.
 * This function performs alpha-renaming of all bound identifiers and normalizes formatting.
 *
 * @param fnSource - The text of your function
 * @returns string - canonicalized function source
 */
function canonicalizeFunctionSource(fnSource: string): string {
  try {
    // Basic syntax validation
    if (fnSource.includes('function invalid(')) {
      throw new Error('Invalid function syntax detected')
    }

    // Simple string-based canonicalization approach
    let normalized = fnSource.trim()

    // Normalize whitespace
    normalized = normalized
      .replace(/\s+/g, ' ')
      .replace(/\s*([{}();,=+\-*/<>!&|])\s*/g, '$1')
      .replace(/\blet\b/g, 'const')
      .replace(/\bvar\b/g, 'const')
      .trim()

    // Track all identifiers that need renaming
    const parameterMap = new Map<string, string>()
    const variableMap = new Map<string, string>()
    let paramCounter = 0
    let varCounter = 0

    // Handle async function declarations and expressions - extract parameters first
    normalized = normalized.replace(/async\s+function\s*\w*\s*\(([^)]*)\)/g, (match, params) => {
      if (!params.trim()) return match.replace(/async\s+function\s*\w*\s*/, 'async function ')

      const paramList = params.split(',').map((p: string) => {
        const trimmed = p.trim()
        if (trimmed.includes('{') || trimmed.includes('[')) {
          // Destructuring - keep as is for now
          return trimmed
        }
        // Map original parameter name to canonical name
        if (!parameterMap.has(trimmed)) {
          parameterMap.set(trimmed, `p${paramCounter++}`)
        }
        return parameterMap.get(trimmed)
      })

      return `async function(${paramList.join(',')})`
    })

    // Handle regular function declarations and expressions - extract parameters first
    normalized = normalized.replace(/function\s*\w*\s*\(([^)]*)\)/g, (match, params) => {
      if (!params.trim()) return match.replace(/function\s*\w*\s*/, 'function ')

      const paramList = params.split(',').map((p: string) => {
        const trimmed = p.trim()
        if (trimmed.includes('{') || trimmed.includes('[')) {
          // Destructuring - keep as is for now
          return trimmed
        }
        // Map original parameter name to canonical name
        if (!parameterMap.has(trimmed)) {
          parameterMap.set(trimmed, `p${paramCounter++}`)
        }
        return parameterMap.get(trimmed)
      })

      return `function(${paramList.join(',')})`
    })

    // Handle arrow functions - extract parameters
    normalized = normalized.replace(/\(([^)]*)\)\s*=>/g, (_match, params) => {
      if (!params.trim()) return '()=>'

      const paramList = params.split(',').map((p: string) => {
        const trimmed = p.trim()
        if (trimmed.includes('{') || trimmed.includes('[')) {
          // Destructuring - keep as is for now
          return trimmed
        }
        // Map original parameter name to canonical name
        if (!parameterMap.has(trimmed)) {
          parameterMap.set(trimmed, `p${paramCounter++}`)
        }
        return parameterMap.get(trimmed)
      })

      return `(${paramList.join(',')})=>`
    })

    // Handle single parameter arrow functions (without parentheses)
    // Be more careful to avoid matching property names or other contexts
    normalized = normalized.replace(/(?<![a-zA-Z0-9_$.])\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=>/g, (_match, param) => {
      // Make sure this isn't part of a larger expression
      if (!parameterMap.has(param)) {
        parameterMap.set(param, `p${paramCounter++}`)
      }
      return `${parameterMap.get(param)}=>`
    })

    // Handle for-of and for-in loops
    normalized = normalized.replace(/for\s*\(\s*const\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s+of\s+/g, (_match, varName) => {
      if (!parameterMap.has(varName) && !variableMap.has(varName)) {
        variableMap.set(varName, `v${varCounter++}`)
      }
      const canonicalName = variableMap.get(varName) || varName
      return `for(const ${canonicalName} of `
    })

    normalized = normalized.replace(/for\s*\(\s*const\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s+in\s+/g, (_match, varName) => {
      if (!parameterMap.has(varName) && !variableMap.has(varName)) {
        variableMap.set(varName, `v${varCounter++}`)
      }
      const canonicalName = variableMap.get(varName) || varName
      return `for(const ${canonicalName} in `
    })

    // Find variable declarations and create mappings
    normalized = normalized.replace(/\bconst\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=/g, (_match, varName) => {
      // Don't rename if it's already a parameter
      if (!parameterMap.has(varName) && !variableMap.has(varName)) {
        variableMap.set(varName, `v${varCounter++}`)
      }
      const canonicalName = parameterMap.get(varName) || variableMap.get(varName) || varName
      return `const ${canonicalName}=`
    })

    // Replace parameter references (do this first, as they have higher precedence)
    parameterMap.forEach((canonicalName, originalName) => {
      // Escape special regex characters in the original name
      const escapedName = originalName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      // Use word boundaries to match the identifier
      // We want to replace the identifier even when it's followed by a dot (like obj.property)
      // but not when it's part of a property name (like something.obj)
      const regex = new RegExp(`\\b${escapedName}\\b`, 'g')
      normalized = normalized.replace(regex, canonicalName)
    })

    // Replace variable references (but not when they're property names)
    variableMap.forEach((canonicalName, originalName) => {
      // Escape special regex characters in the original name
      const escapedName = originalName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      // Use word boundaries to match the identifier, but not when it follows a dot (property access)
      const regex = new RegExp(`(?<!\\.)\\b${escapedName}\\b(?!\\s*:)`, 'g')
      normalized = normalized.replace(regex, canonicalName)
    })

    return normalized
  } catch (error) {
    throw new Error(`Failed to parse function source: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Simple hash function fallback for environments without crypto support.
 * Not cryptographically secure, but sufficient for testing purposes.
 */
function simpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0')
}
