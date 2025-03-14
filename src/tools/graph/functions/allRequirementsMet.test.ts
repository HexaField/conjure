import { describe, expect, it } from 'vitest'
import { allRequirementsMet, getRequirements } from './allRequirementsMet'
import { JSONSchema } from './generateJsonSchema'

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
    expect(result).toEqual(['person.name', 'person.age'])
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
    expect(result).toEqual(['people.name', 'people.age'])
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
    const schema: JSONSchema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'number' }
      }
    }
    const mapping = { name: 'John', age: 30 }
    const result = allRequirementsMet(schema, mapping)
    expect(result).toBe(true)
  })

  it('should return false when a requirement is not met', () => {
    const schema: JSONSchema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'number' }
      }
    }
    const mapping = { name: 'John' }
    const result = allRequirementsMet(schema, mapping)
    expect(result).toBe(false)
  })
})
