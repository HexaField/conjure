export interface JSONSchema {
  type: string
  properties?: { [key: string]: JSONSchema }
  items?: JSONSchema
  optional?: boolean
  format?: string
  default?: any
}

export type JSONPathPartial = string | number | boolean

export interface JSONMappingSchema {
  type: string
  properties?: { [key: string]: JSONMappingSchema }
  value?: JSONPathPartial
  items?: JSONMappingSchema
  optional?: boolean
  format?: string
}

export type JSONSchemaToType<T extends JSONSchema> = T extends { type: 'string' }
  ? string
  : T extends { type: 'number' }
  ? number
  : T extends { type: 'integer' }
  ? number
  : T extends { type: 'boolean' }
  ? boolean
  : T extends { type: 'array'; items: infer Item }
  ? Item extends JSONSchema
    ? JSONSchemaToType<Item>[]
    : unknown[]
  : T extends { type: 'object'; properties: infer Props }
  ? {
      [K in keyof Props]: Props[K] extends JSONSchema ? JSONSchemaToType<Props[K]> : unknown
    }
  : unknown

/**
 * Recursively infers a JSON Schema for a given value.
 * @param value - The value to inspect.
 * @returns A JSONSchema object compliant with the JSON Schema specification.
 */
function inferJsonSchemaForValue(value: any): JSONSchema {
  if (value === null || value === undefined) {
    // When the value is null or undefined, we return a schema that accepts null.
    return { type: 'null' }
  }
  if (typeof value === 'number') {
    return { type: 'number' }
  }
  if (typeof value === 'boolean') {
    return { type: 'boolean' }
  }
  if (typeof value === 'string') {
    // Check if the string can be parsed as a date.
    const timestamp = Date.parse(value)
    if (!isNaN(timestamp)) {
      return { type: 'string', format: 'date-time' }
    }
    return { type: 'string' }
  }
  if (Array.isArray(value)) {
    // For arrays, attempt to infer the schema from the first non-null element.
    const sample = value.find((item) => item !== null && item !== undefined)
    /** @todo we should include 'optional' as a field here for all properties only in some entries of the array */
    if (sample !== undefined) {
      return { type: 'array', items: inferJsonSchemaForValue(sample) }
    } else {
      // If no sample is found, allow any items.
      return { type: 'array', items: {} as JSONSchema }
    }
  }
  if (typeof value === 'object') {
    const properties: { [key: string]: JSONSchema } = {}
    Object.keys(value).forEach((key) => {
      properties[key] = inferJsonSchemaForValue(value[key])
    })
    return { type: 'object', properties }
  }
  // Fallback: return string type.
  return { type: 'string' }
}

/**
 * Generates a JSON Schema for the provided raw data.
 * If the raw data is not an array, it wraps it in one.
 * The returned schema describes an array of items.
 * @param rawData - The raw data fetched from the endpoint.
 * @returns A JSONSchema object representing the data structure.
 */
export function generateJsonSchema(rawData: any): JSONSchema {
  if (Array.isArray(rawData)) {
    // Infer the schema from the first item (assuming homogeneity).
    const itemSchema = inferJsonSchemaForValue(rawData[0])
    return {
      type: 'array',
      items: itemSchema
    }
  }
  return inferJsonSchemaForValue(rawData)
}
