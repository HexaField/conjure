import { JSONMappingSchema } from './generateJsonSchema'

export const getRequirements = (schema: JSONMappingSchema, path: string): string[] => {
  let result: string[] = []
  if (schema.optional) return result
  if (schema.type === 'object' && schema.properties) {
    for (const key in schema.properties) {
      const childSchema = schema.properties[key]
      if (childSchema.optional) continue
      if (childSchema.value) continue
      if (childSchema.type === 'object' && childSchema.properties) {
        result = [...result, ...getRequirements(childSchema, path ? `${path}.properties.${key}` : `properties.${key}`)]
      } else if (childSchema.type === 'array' && childSchema.items && childSchema.items.type === 'object') {
        result = [...result, ...getRequirements(childSchema.items, path ? `${path}.items.${key}` : `items.${key}`)]
      } else {
        result.push(path ? `${path}.${key}` : key)
      }
    }
  } else if (schema.type === 'array' && schema.items) {
    if (schema.items.type === 'array') {
      result.push(path)
    } else {
      result.push(path)
    }
  } else {
    result.push(path)
  }
  return result
}

export const allRequirementsMet = (mapping: JSONMappingSchema): boolean => {
  const pendingRequirements = getRequirements(mapping, '')
  console.log('pendingRequirements', pendingRequirements)
  return pendingRequirements.length === 0
}
