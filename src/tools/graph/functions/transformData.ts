import { JSONPath } from 'jsonpath-plus'
import { JSONMappingSchema } from './generateJsonSchema'

/**
 * Transforms input JSON data using a valid JSON Schema transformation definition.
 * @param {Object} inputData - The original JSON data.
 * @param {Object} schema - A valid JSON Schema defining the output structure.
 * @returns {Object} - The transformed JSON output.
 */
export function transformData(inputData: unknown, schema: JSONMappingSchema) {
  if (!schema.type || schema.type !== 'object') {
    throw new Error('Schema must define an object structure.')
  }

  // Function to process each item based on schema
  function processItem(data: any, schemaDef: JSONMappingSchema) {
    let transformedItem = {}

    for (const [key, definition] of Object.entries(schemaDef.properties || {}) as [string, JSONMappingSchema][]) {
      if (
        (definition.type === 'string' || definition.type === 'number' || definition.type === 'boolean') &&
        definition.value
      ) {
        // Direct mapping using JSONPath
        transformedItem[key] = JSONPath({ path: `$..${definition.value}`, json: data })[0]
      } else if (definition.type === 'array' && definition.items) {
        // Transform arrays using defined structure
        const sourceArray = JSONPath({ path: `$..${definition.value}`, json: data })[0] || []
        transformedItem[key] = sourceArray.map((item) => processItem(item, definition.items!))
      } else if (definition.type === 'object') {
        // Recursively process objects
        transformedItem[key] = processItem(data, definition)
      }
    }

    return transformedItem
  }

  return processItem(inputData, schema)
}
