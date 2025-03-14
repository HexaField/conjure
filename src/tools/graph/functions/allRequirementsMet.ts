import { JSONSchema } from './generateJsonSchema'

export const getRequirements = (schema: JSONSchema, path: string): string[] => {
  let result: string[] = []
  if (schema.optional) return result
  if (schema.type === 'object' && schema.properties) {
    for (const key in schema.properties) {
      const childSchema = schema.properties[key]
      if (childSchema.optional) continue
      if (childSchema.type === 'object' && childSchema.properties) {
        result = [...result, ...getRequirements(childSchema, path ? `${path}.${key}` : key)]
      } else if (childSchema.type === 'array' && childSchema.items && childSchema.items.type === 'object') {
        result = [...result, ...getRequirements(childSchema.items, path ? `${path}.${key}` : key)]
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

export const getNestedObjectIgnoringArrays = (obj: any, path: string): any => {
  const parts = path.split('.')
  let result = obj
  for (const part of parts) {
    if (result[part] === undefined) {
      return
    }
    if (Array.isArray(result[part])) {
      result = result[part][0]
      continue
    }
    result = result[part]
  }
  return result
}

export const allRequirementsMet = (schema: JSONSchema, mapping: any): boolean => {
  const requirements = getRequirements(schema, '')
  return requirements.every((req) => !!getNestedObjectIgnoringArrays(mapping, req))
}
