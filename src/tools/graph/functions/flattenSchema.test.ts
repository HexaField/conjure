import { describe, expect, it } from 'vitest'
import { flattenSchema } from './flattenSchema'
import { JSONSchema } from './generateJsonSchema'

describe('flattenSchema', () => {
  it('should flatten a simple object schema', () => {
    const schema: JSONSchema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'number' }
      }
    }
    const result = flattenSchema(schema)
    expect(result).toEqual({
      name: { type: 'string' },
      age: { type: 'number' }
    })
  })

  it('should flatten a nested object schema', () => {
    const schema: JSONSchema = {
      type: 'object',
      properties: {
        person: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            age: { type: 'number' }
          }
        }
      }
    }
    const result = flattenSchema(schema)
    expect(result).toEqual({
      'person.name': { type: 'string' },
      'person.age': { type: 'number' }
    })
  })

  it('should flatten an array of objects', () => {
    const schema: JSONSchema = {
      type: 'object',
      properties: {
        people: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              age: { type: 'number' }
            }
          }
        }
      }
    }
    const sampleData = {
      people: [{ name: 'John', age: 30 }]
    }
    const result = flattenSchema(schema, '', sampleData)
    expect(result).toEqual({
      'people.0.name': { type: 'string' },
      'people.0.age': { type: 'number' }
    })
  })

  it('should flatten an array of arrays with fixed length', () => {
    const schema: JSONSchema = {
      type: 'object',
      properties: {
        matrix: {
          type: 'array',
          items: {
            type: 'array',
            items: { type: 'number' }
          }
        }
      }
    }
    const sampleData = {
      matrix: [
        [1, 2],
        [3, 4]
      ]
    }
    const result = flattenSchema(schema, '', sampleData)
    expect(result).toEqual({
      'matrix.0': { type: 'number' },
      'matrix.1': { type: 'number' }
    })
  })

  it('should flatten an array of arrays without fixed length', () => {
    const schema: JSONSchema = {
      type: 'object',
      properties: {
        matrix: {
          type: 'array',
          items: {
            type: 'array',
            items: { type: 'number' }
          }
        }
      }
    }
    const sampleData = {
      matrix: [
        [1, 2],
        [3, 4, 5]
      ]
    }
    const result = flattenSchema(schema, '', sampleData)
    expect(result).toEqual({
      matrix: { type: 'number' }
    })
  })

  it('should flatten an array of primitives', () => {
    const schema: JSONSchema = {
      type: 'object',
      properties: {
        tags: {
          type: 'array',
          items: { type: 'string' }
        }
      }
    }
    const sampleData = {
      tags: ['tag1', 'tag2']
    }
    const result = flattenSchema(schema, '', sampleData)
    expect(result).toEqual({
      /** @todo this isn't right... */
      tags: { type: 'string' }
    })
  })

  it('should handle an empty schema', () => {
    // @ts-ignore
    const schema: JSONSchema = {}
    const result = flattenSchema(schema)
    expect(result).toEqual({})
  })

  it('should handle a schema with no properties', () => {
    const schema: JSONSchema = {
      type: 'object'
    }
    const result = flattenSchema(schema)
    expect(result).toEqual({})
  })
})
