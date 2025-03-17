import { describe, expect, it } from 'vitest'
import { allRequirementsMet, getRequirements } from './allRequirementsMet'
import { JSONMappingSchema, JSONSchema } from './generateJsonSchema'

describe('getRequirements', () => {
  it('should return an empty array for an optional schema', () => {
    const schema: JSONSchema = { type: 'object', optional: true }
    const result = getRequirements(schema, '')
    expect(result).toEqual([])
  })

  it('should return required fields for a simple object schema', () => {
    const schema: JSONSchema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'number' }
      }
    }
    const result = getRequirements(schema, '')
    expect(result).toEqual(['name', 'age'])
  })

  it('should return required fields for a nested object schema', () => {
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
    const result = getRequirements(schema, '')
    expect(result).toEqual(['properties.person.name', 'properties.person.age'])
  })

  it('should return required fields for an array of objects', () => {
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
    const result = getRequirements(schema, '')
    expect(result).toEqual(['items.people.name', 'items.people.age'])
  })

  it('should return required fields for an array of arrays', () => {
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
    const result = getRequirements(schema, '')
    expect(result).toEqual(['matrix'])
  })
})

describe('allRequirementsMet', () => {
  it('should return true when all requirements are met', () => {
    const mapping: JSONMappingSchema = {
      type: 'object',
      properties: {
        name: { type: 'string', value: 'John' },
        age: { type: 'number', value: 30 }
      }
    }
    const result = allRequirementsMet(mapping)
    expect(result).toBe(true)
  })

  it('should return false when a requirement is not met', () => {
    const mapping: JSONMappingSchema = {
      type: 'object',
      properties: {
        name: { type: 'string', value: 'John' },
        age: { type: 'number' }
      }
    }
    const result = allRequirementsMet(mapping)
    expect(result).toBe(false)
  })
})
