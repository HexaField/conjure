import transform from '@hexafield/jsonpath-object-transform'
import { FromSchema } from 'json-schema-to-ts'
import { describe, expect, it } from 'vitest'

const test1Schema = {
  type: 'object',
  properties: {
    name: {
      type: 'string'
    },
    url: {
      type: 'string'
    },
    relationships: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          predicate_url: {
            type: 'string'
          },
          object_url: {
            type: 'string'
          }
        },
        required: ['predicate_url', 'object_url']
      }
    }
  },
  required: ['url', 'name']
} as const

const test2Schema = {
  type: 'object',
  required: ['nodes', 'edges'],
  properties: {
    nodes: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'label'],
        properties: {
          id: { type: 'string' },
          label: { type: 'string' }
        }
      }
    },
    edges: {
      type: 'array',
      items: {
        type: 'object',
        required: ['source', 'target'],
        properties: {
          source: { type: 'string' },
          target: { type: 'string' },
          type: { type: 'string' }
        }
      }
    }
  }
} as const

type Schema1 = FromSchema<typeof test1Schema>
type Schema2 = FromSchema<typeof test2Schema>

describe('jsonpath-object-transform', () => {
  it('should convert object from one schema to another', () => {
    const input: Schema1[] = [
      {
        name: 'Object 1',
        url: 'http://example.com/object1.json',
        relationships: [
          {
            predicate_url: 'http://example.com/predicateA.json',
            object_url: 'http://example.com/object2.json'
          },
          {
            predicate_url: 'http://example.com/predicateB.json',
            object_url: 'http://example.com/object3.json'
          }
        ]
      },
      {
        name: 'Object 2',
        url: 'http://example.com/object2.json',
        relationships: [
          {
            predicate_url: 'http://example.com/predicateC.json',
            object_url: 'http://example.com/object4.json'
          }
        ]
      }
    ]

    const transformSchema = {
      nodes: [
        '$.',
        {
          id: '@.url',
          label: '@.name'
        }
      ],
      edges: [
        '$..relationships[*]',
        {
          source: '$.url',
          target: '@.object_url',
          type: '@.predicate_url'
        }
      ]
    }

    const expectedOutput: Schema2 = {
      nodes: [
        {
          id: 'http://example.com/object1.json',
          label: 'Object 1'
        },
        {
          id: 'http://example.com/object2.json',
          label: 'Object 2'
        }
      ],
      edges: [
        {
          source: 'http://example.com/object1.json',
          target: 'http://example.com/object2.json',
          type: 'http://example.com/predicateA.json'
        },
        {
          source: 'http://example.com/object1.json',
          target: 'http://example.com/object3.json',
          type: 'http://example.com/predicateB.json'
        },
        {
          source: 'http://example.com/object2.json',
          target: 'http://example.com/object4.json',
          type: 'http://example.com/predicateC.json'
        }
      ]
    }

    const output = transform(input, transformSchema)

    console.log('output:', output)

    expect(output).toEqual(expectedOutput)
  })

  it('should convert object from one schema to another', () => {
    const input = {
      elements: [
        {
          Id: 1,
          Label: 'Object 1',
          Type: 'Type A',
          Image: 'http://example.com/image1.png'
        },
        {
          Id: 2,
          Label: 'Object 2',
          Type: 'Type B',
          Image: 'http://example.com/image2.png'
        }
      ],
      connections: [
        {
          From: 1,
          To: 2,
          Weight: 5
        }
      ]
    }

    const transformSchema = {
      nodes: [
        '$.elements',
        {
          id: '@.Id',
          label: '@.Label'
        }
      ],
      edges: [
        '$.connections',
        {
          source: '@.From',
          target: '@.To'
        }
      ]
    }

    const expectedOutput = {
      nodes: [
        {
          id: 1,
          label: 'Object 1'
        },
        {
          id: 2,
          label: 'Object 2'
        }
      ],
      edges: [
        {
          source: 1,
          target: 2
        }
      ]
    }

    const output = transform(input, transformSchema)

    console.log('output:', output)

    expect(output).toEqual(expectedOutput)
  })
})
