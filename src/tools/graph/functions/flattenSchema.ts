import { JSONSchema } from './generateJsonSchema'

/** @todo remake this such that it outputs it's keys as valid JSON Paths */

/**
 * Recursively flattens a JSONSchema so that nested properties are represented
 * with period-separated keys.
 *
 * When encountering an array-of-arrays, if sample data is provided and every sub-array
 * has the same length, it will flatten the inner array so that each index becomes
 * a selectable field (using the index as part of the period-separated key).
 *
 * @param schema - The JSON Schema to flatten.
 * @param prefix - The current prefix (used during recursion).
 * @param sampleData - Optional sample data to help determine fixed lengths.
 * @returns An object whose keys are period-separated field paths, and whose values are the corresponding JSONSchema.
 */
export function flattenSchema(
  schema: JSONSchema,
  prefix: string = '',
  sampleData?: any
): { [key: string]: JSONSchema } {
  let result: { [key: string]: JSONSchema } = {}

  if (schema.type === 'object' && schema.properties) {
    for (const key in schema.properties) {
      const fullKey = prefix ? `${prefix}.${key}` : key
      const childSchema = schema.properties[key]

      // If the property is an object, recurse.
      if (childSchema.type === 'object' && childSchema.properties) {
        result = {
          ...result,
          ...flattenSchema(childSchema, fullKey, sampleData ? sampleData[key] : undefined)
        }
      }
      // For an array of objects, flatten the items.
      else if (
        childSchema.type === 'array' &&
        childSchema.items &&
        childSchema.items.type === 'object' &&
        childSchema.items.properties
      ) {
        result = {
          ...result,
          ...flattenSchema(
            childSchema.items,
            // if the array has one element, it's the only data we can use, so reference it directly
            sampleData[key].length === 1 ? fullKey + '.0' : fullKey,
            sampleData ? sampleData[key]?.[0] : undefined
          )
        }
      }
      // For an array-of-arrays, try to infer a fixed length from sample data.
      else if (childSchema.type === 'array' && childSchema.items && childSchema.items.type === 'array') {
        let fixedLength: number | null = null
        // If sample data is available for this property and is an array...
        if (sampleData && Array.isArray(sampleData[key])) {
          const arr = sampleData[key]
          // Filter out elements that are arrays.
          const subArrays = arr.filter((x: any) => Array.isArray(x))
          if (subArrays.length > 0) {
            const firstLength = subArrays[0].length
            // Check if every sub-array has the same length.
            const allSame = subArrays.every((sub: any) => sub.length === firstLength)
            if (allSame) {
              fixedLength = firstLength
            }
          }
        }
        if (fixedLength !== null && childSchema.items.items) {
          // For each index in the fixed-length sub-arrays, flatten the inner schema.
          for (let i = 0; i < fixedLength; i++) {
            const newPrefix = `${fullKey}.${i}`
            // Pass the corresponding sample data (if available) for this index.
            const sampleForIndex = sampleData && Array.isArray(sampleData[key]) ? sampleData[key][i] : undefined
            result = {
              ...result,
              ...flattenSchema(childSchema.items.items, newPrefix, sampleForIndex)
            }
          }
        } else {
          // If we can’t infer a fixed length, fall back to flattening the array normally.
          result = {
            ...result,
            ...flattenSchema(childSchema.items, fullKey, sampleData ? sampleData[key] : undefined)
          }
        }
      }
      // For a regular array (non-array-of-arrays), flatten the items.
      else if (childSchema.type === 'array' && childSchema.items) {
        result = {
          ...result,
          ...flattenSchema(childSchema.items, fullKey, sampleData ? sampleData[key] : undefined)
        }
      }
      // Base case: a primitive value.
      else {
        result[fullKey] = childSchema
      }
    }
  } else if (schema.type === 'array' && schema.items) {
    // If the schema itself is an array, try to flatten its items.
    if (schema.items.type === 'array') {
      let fixedLength: number | null = null
      if (sampleData && Array.isArray(sampleData)) {
        const subArrays = sampleData.filter((x: any) => Array.isArray(x))
        if (subArrays.length > 0) {
          const firstLength = subArrays[0].length
          const allSame = subArrays.every((sub: any) => sub.length === firstLength)
          if (allSame) fixedLength = firstLength
        }
      }
      if (fixedLength !== null && schema.items.items) {
        for (let i = 0; i < fixedLength; i++) {
          const newPrefix = prefix ? `${prefix}.${i}` : `${i}`
          result = {
            ...result,
            ...flattenSchema(
              schema.items.items,
              newPrefix,
              sampleData && Array.isArray(sampleData) ? sampleData[i] : undefined
            )
          }
        }
      } else {
        result = { ...result, ...flattenSchema(schema.items, prefix, sampleData) }
      }
    } else {
      result = { ...result, ...flattenSchema(schema.items, prefix, sampleData) }
    }
  } else {
    if (prefix) {
      result[prefix] = schema
    }
  }
  return result
}
