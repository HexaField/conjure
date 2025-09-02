import type { JSONSchemaType } from './JSONSchema'

// RFC 3339 date-time as referenced by JSON Schema "date-time" format (RFC 3339, section 5.6)
// Example: 2020-12-31T23:59:59Z, 2020-12-31T23:59:59.123Z, 2020-12-31T23:59:59+01:00
// This checks structural conformance; it does not validate calendar edge cases like Feb 30th.
const RFC3339_DATE_TIME =
  /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])T([01]\d|2[0-3]):([0-5]\d):([0-5]\d)(?:\.(\d+))?(Z|[+\-]([01]\d|2[0-3]):[0-5]\d)$/

function isRFC3339DateTime(value: string): boolean {
  return RFC3339_DATE_TIME.test(value)
}

/**
 * Infer a JSON Schema that accepts all of the provided values.
 * This merges heterogeneous types using anyOf and computes object.required.
 */
function inferSchemaFromValues(values: any[]): JSONSchemaType<any> {
  // Classify values
  const nonUndef = values.filter((v) => v !== undefined)
  if (nonUndef.length === 0) {
    // If everything was undefined, allow null
    return { type: 'null', nullable: true }
  }

  const hasNull = nonUndef.some((v) => v === null)
  const scalars = nonUndef.filter((v) => v !== null && typeof v !== 'object')
  const arrays = nonUndef.filter((v) => Array.isArray(v)) as any[]
  const objects = nonUndef.filter((v) => v !== null && typeof v === 'object' && !Array.isArray(v)) as Record<
    string,
    any
  >[]

  // Primitive types
  const boolCount = scalars.filter((v) => typeof v === 'boolean').length
  const numVals = scalars.filter((v) => typeof v === 'number') as number[]
  const strVals = scalars.filter((v) => typeof v === 'string') as string[]

  const variants: JSONSchemaType<any>[] = []

  // booleans
  if (boolCount > 0) variants.push({ type: 'boolean' })

  // numbers: prefer integer if all observed numbers are integers
  if (numVals.length > 0) {
    const allIntegers = numVals.every((n) => Number.isInteger(n))
    variants.push({ type: allIntegers ? 'integer' : 'number' } as JSONSchemaType<any>)
  }

  // strings: keep format only if every string matches it; otherwise drop format
  if (strVals.length > 0) {
    const allDateTime = strVals.length > 0 && strVals.every((s) => isRFC3339DateTime(s))
    variants.push(
      allDateTime
        ? ({ type: 'string', format: 'date-time' } as JSONSchemaType<any>)
        : ({ type: 'string' } as JSONSchemaType<any>)
    )
  }

  // arrays: merge items across all array elements
  if (arrays.length > 0) {
    const allItems: any[] = []
    for (const arr of arrays as any[][]) {
      for (const item of arr) allItems.push(item)
    }
    const itemsSchema: JSONSchemaType<any> =
      allItems.length > 0 ? inferSchemaFromValues(allItems) : ({} as JSONSchemaType<any>)
    variants.push({ type: 'array', items: itemsSchema } as JSONSchemaType<any>)
  }

  // objects: merge properties and required keys across all objects
  if (objects.length > 0) {
    const keySet = new Set<string>()
    const presentCount = new Map<string, number>()
    const valueBuckets: Record<string, any[]> = {}

    for (const obj of objects) {
      const keys = Object.keys(obj)
      for (const k of keys) {
        keySet.add(k)
        presentCount.set(k, (presentCount.get(k) ?? 0) + 1)
        if (!valueBuckets[k]) valueBuckets[k] = []
        valueBuckets[k].push(obj[k])
      }
    }

    const properties: { [key: string]: JSONSchemaType<any> } = {}
    for (const k of keySet) {
      properties[k] = inferSchemaFromValues(valueBuckets[k] ?? [])
    }
    const required: string[] = []
    for (const k of keySet) {
      if ((presentCount.get(k) ?? 0) === objects.length) required.push(k)
    }

    const objectSchema: JSONSchemaType<any> = {
      type: 'object',
      properties,
      ...(required.length > 0 ? { required } : {})
    } as unknown as JSONSchemaType<any>
    variants.push(objectSchema)
  }

  // Build final union, adding null when present
  const nullSchema = hasNull ? ({ type: 'null', nullable: true } as JSONSchemaType<any>) : undefined

  if (variants.length === 0) {
    // Only nulls present
    return nullSchema ?? ({ type: 'string' } as JSONSchemaType<any>)
  }

  if (variants.length === 1 && !nullSchema) return variants[0]
  if (variants.length === 1 && nullSchema) return { anyOf: [variants[0], nullSchema] } as JSONSchemaType<any>

  // Multiple variants
  return { anyOf: [...variants, ...(nullSchema ? [nullSchema] : [])] } as JSONSchemaType<any>
}

/**
 * Generates a JSON Schema for the provided raw data, merging all observed values.
 * - If rawData is an array, returns an array schema whose items accept all item variants.
 * - If rawData is a single value/object, returns a schema for that value.
 */
export function generateJsonSchema(rawData: any): JSONSchemaType<any> {
  if (Array.isArray(rawData)) {
    const itemSchema = rawData.length > 0 ? inferSchemaFromValues(rawData) : ({} as JSONSchemaType<any>)
    return { type: 'array', items: itemSchema } as JSONSchemaType<any>
  }
  return inferSchemaFromValues([rawData])
}
