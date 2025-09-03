import canonicalize from 'canonicalize'
import { createHash } from 'crypto'
import { JSONSchema } from 'json-schema-to-ts'
import { SHA256Hash } from '../registries/SchemaRegistry'

/**
 * Produces a deterministic SHA-256 hash of any JSON-like object, canonicalising it with RFC8785 (https://datatracker.ietf.org/doc/html/rfc8785).
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

/**
 * Creates a copy of a JSON Schema with all metadata removed, which is then canonicalised and hashed to create a unique identifier for the structure described by the schema.
 * @param schema
 */
export function contentHashJSONSchema(schema: JSONSchema): SHA256Hash {
  const structural = toStructuralSchema(schema as any)
  return contentHash(structural)
}

// Keys considered annotations/metadata per JSON Schema, which should be excluded from the structural view.
const ANNOTATION_KEYS = new Set<keyof any>([
  'title',
  'description',
  'examples',
  'default',
  'deprecated',
  'readOnly',
  'writeOnly',
  '$comment',
  '$id',
  '$schema'
])

// Keys that affect validation/structure and must be retained.
const STRUCTURAL_KEYS = new Set<keyof any>([
  // Core/dollar keys
  '$ref',
  '$defs',
  'definitions', // legacy alias used in older drafts

  // Applicators
  'allOf',
  'anyOf',
  'oneOf',
  'not',
  'if',
  'then',
  'else',

  // Types and basic assertions
  'type',
  'const',
  'enum',

  // Numeric
  'multipleOf',
  'maximum',
  'exclusiveMaximum',
  'minimum',
  'exclusiveMinimum',

  // String
  'maxLength',
  'minLength',
  'pattern',
  'format',
  'contentEncoding',
  'contentMediaType',
  'contentSchema',

  // Array
  'items',
  'prefixItems',
  'contains',
  'minItems',
  'maxItems',
  'uniqueItems',
  'unevaluatedItems',

  // Object
  'maxProperties',
  'minProperties',
  'required',
  'properties',
  'patternProperties',
  'additionalProperties',
  'propertyNames',
  'dependentSchemas',
  'dependentRequired',
  'dependencies', // legacy alias used in older drafts
  'unevaluatedProperties'
])

function isObject(value: any): value is Record<string, any> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function normalizeStringArray(arr: unknown): string[] | undefined {
  if (!Array.isArray(arr)) return undefined
  // Keep only strings, sort for determinism
  return [...arr].filter((v): v is string => typeof v === 'string').sort()
}

function sortSchemasArray(arr: any[]): any[] {
  // Order of allOf/anyOf/oneOf does not affect semantics; sort deterministically by canonical form
  return [...arr].sort((a, b) => {
    const sa = canonicalize(toStructuralSchema(a)) ?? JSON.stringify(a)
    const sb = canonicalize(toStructuralSchema(b)) ?? JSON.stringify(b)
    if (sa < sb) return -1
    if (sa > sb) return 1
    return 0
  })
}

function mapValues<T, R>(obj: Record<string, T>, fn: (v: T, k: string) => R): Record<string, R> {
  const out: Record<string, R> = {}
  // Ensure deterministic key order by iterating sorted keys
  for (const key of Object.keys(obj).sort()) {
    out[key] = fn(obj[key], key)
  }
  return out
}

// Recursively build a new schema object keeping only structural/validation-related facets.
function toStructuralSchema(schema: any): any {
  // Boolean schemas are already structural by definition
  if (typeof schema === 'boolean') return schema
  if (!isObject(schema)) return schema

  const out: Record<string, any> = {}

  // $ref short-circuits most other keywords in evaluation, but we still include it if present
  if ('$ref' in schema && typeof schema.$ref === 'string') {
    out.$ref = schema.$ref
    // Note: Even with $ref, additional keywords MAY appear; keep them if present below.
  }

  // $defs/definitions: sanitize each subschema
  if (isObject(schema.$defs)) {
    out.$defs = mapValues(schema.$defs, (sub) => toStructuralSchema(sub))
  }
  if (isObject(schema.definitions)) {
    out.definitions = mapValues(schema.definitions, (sub) => toStructuralSchema(sub))
  }

  // Combinators
  for (const key of ['allOf', 'anyOf', 'oneOf'] as const) {
    const val = (schema as any)[key]
    if (Array.isArray(val)) out[key] = sortSchemasArray(val.map((s) => toStructuralSchema(s)))
  }
  if (schema.not !== undefined) out.not = toStructuralSchema(schema.not)
  if (schema.if !== undefined) out.if = toStructuralSchema(schema.if)
  if (schema.then !== undefined) out.then = toStructuralSchema(schema.then)
  if (schema.else !== undefined) out.else = toStructuralSchema(schema.else)

  // Basic
  if (schema.type !== undefined) {
    if (Array.isArray(schema.type)) {
      // Normalize order for determinism
      out.type = [...schema.type].sort()
    } else {
      out.type = schema.type
    }
  }
  if (schema.const !== undefined) out.const = schema.const
  if (schema.enum !== undefined && Array.isArray(schema.enum)) {
    // Sort by canonical form for determinism
    out.enum = [...schema.enum].sort((a, b) => {
      const sa = canonicalize(a) ?? JSON.stringify(a)
      const sb = canonicalize(b) ?? JSON.stringify(b)
      return sa < sb ? -1 : sa > sb ? 1 : 0
    })
  }

  // Numeric
  for (const key of ['multipleOf', 'maximum', 'exclusiveMaximum', 'minimum', 'exclusiveMinimum'] as const) {
    if (schema[key] !== undefined) out[key] = schema[key]
  }

  // String
  for (const key of ['maxLength', 'minLength', 'pattern', 'format', 'contentEncoding', 'contentMediaType'] as const) {
    if (schema[key] !== undefined) out[key] = schema[key]
  }
  if (schema.contentSchema !== undefined) out.contentSchema = toStructuralSchema(schema.contentSchema)

  // Array
  if (schema.items !== undefined) {
    if (Array.isArray(schema.items)) {
      // Tuple validation – order is significant, so do NOT sort
      out.items = schema.items.map((s: any) => toStructuralSchema(s))
    } else {
      out.items = toStructuralSchema(schema.items)
    }
  }
  if (Array.isArray(schema.prefixItems)) {
    // Order matters – do NOT sort
    out.prefixItems = schema.prefixItems.map((s: any) => toStructuralSchema(s))
  }
  if (schema.contains !== undefined) out.contains = toStructuralSchema(schema.contains)
  for (const key of ['minItems', 'maxItems', 'uniqueItems'] as const) {
    if (schema[key] !== undefined) out[key] = schema[key]
  }
  if (schema.unevaluatedItems !== undefined) {
    out.unevaluatedItems =
      typeof schema.unevaluatedItems === 'boolean'
        ? schema.unevaluatedItems
        : toStructuralSchema(schema.unevaluatedItems)
  }

  // Object
  for (const key of ['maxProperties', 'minProperties'] as const) {
    if (schema[key] !== undefined) out[key] = schema[key]
  }
  const req = normalizeStringArray(schema.required)
  if (req && req.length) out.required = req
  if (isObject(schema.properties)) {
    out.properties = mapValues(schema.properties, (sub) => toStructuralSchema(sub))
  }
  if (isObject(schema.patternProperties)) {
    out.patternProperties = mapValues(schema.patternProperties, (sub) => toStructuralSchema(sub))
  }
  if (schema.additionalProperties !== undefined) {
    out.additionalProperties =
      typeof schema.additionalProperties === 'boolean'
        ? schema.additionalProperties
        : toStructuralSchema(schema.additionalProperties)
  }
  if (schema.propertyNames !== undefined) {
    out.propertyNames = toStructuralSchema(schema.propertyNames)
  }
  if (isObject(schema.dependentSchemas)) {
    out.dependentSchemas = mapValues(schema.dependentSchemas, (sub) => toStructuralSchema(sub))
  }
  if (isObject(schema.dependentRequired)) {
    out.dependentRequired = mapValues(schema.dependentRequired, (arr) => normalizeStringArray(arr as any) ?? [])
  }
  if (isObject(schema.dependencies)) {
    // Legacy: values can be schema or array of strings
    out.dependencies = mapValues(schema.dependencies as Record<string, any>, (val) => {
      if (Array.isArray(val)) return normalizeStringArray(val) ?? []
      return toStructuralSchema(val)
    })
  }
  if (schema.unevaluatedProperties !== undefined) {
    out.unevaluatedProperties =
      typeof schema.unevaluatedProperties === 'boolean'
        ? schema.unevaluatedProperties
        : toStructuralSchema(schema.unevaluatedProperties)
  }

  // Finally, ensure we didn't accidentally copy annotations
  for (const k in schema) {
    if (!STRUCTURAL_KEYS.has(k) && !ANNOTATION_KEYS.has(k)) {
      // Unknown keys: conservatively include if they are objects/arrays that look like schemas affecting validation.
      // To avoid metadata leakage, only include recognized structural keywords.
      // So we intentionally skip unknown keys.
    }
  }

  return out
}
