import { describe, expect, it } from 'vitest'
import { JSONMappingSchema } from './generateJsonSchema'
import { transformData } from './transformData'

// Tests

describe('transformData', () => {
  it('should transform nested object data to flat array', () => {
    const inputData = {
      profiles: [
        {
          _id: 'a',
          data: {
            profile: {
              username: 'Alice',
              url: 'https://alice.com/'
            }
          }
        },
        {
          _id: 'b',
          data: {
            profile: {
              username: 'Bob',
              url: 'https://bob.org/'
            }
          }
        },
        {
          _id: 'c',
          data: {
            profile: {
              username: 'Charlie',
              url: 'https://charlie.net/'
            }
          }
        }
      ]
    }

    const jsonRules2: JSONMappingSchema = {
      type: 'object',
      properties: {
        output: {
          type: 'array',
          value: 'profiles',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', value: '_id' },
              name: { type: 'string', value: 'data.profile.username' }
            }
          }
        }
      }
    }

    const outputData = transformData(inputData, jsonRules2)

    expect(outputData).toEqual({
      output: [
        { id: 'a', name: 'Alice' },
        { id: 'b', name: 'Bob' },
        { id: 'c', name: 'Charlie' }
      ]
    })
  })

  it('should transform data with provided mapping', () => {
    const inputData = {
      profiles: [
        {
          _id: 'a',
          data: {
            profile: {
              username: 'Alice',
              url: 'https://alice.com/'
            }
          }
        },
        {
          _id: 'b',
          data: {
            profile: {
              username: 'Bob',
              url: 'https://bob.org/'
            }
          }
        },
        {
          _id: 'c',
          data: {
            profile: {
              username: 'Charlie',
              url: 'https://charlie.net/'
            }
          }
        }
      ],
      edges: [
        ['a', 'b'],
        ['b', 'c']
      ]
    }

    const jsonRules: JSONMappingSchema = {
      type: 'object',
      properties: {
        nodes: {
          type: 'array',
          value: 'profiles',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', value: '_id' },
              label: { type: 'string', value: 'data.profile.username' }
            }
          }
        },
        edges: {
          type: 'array',
          value: 'edges',
          items: {
            type: 'object',
            properties: {
              source: { type: 'string', value: '0' },
              target: { type: 'string', value: '1' }
            }
          }
        }
      }
    }

    const outputData = transformData(inputData, jsonRules)

    expect(outputData).toEqual({
      nodes: [
        {
          id: 'a',
          label: 'Alice'
        },
        {
          id: 'b',
          label: 'Bob'
        },
        {
          id: 'c',
          label: 'Charlie'
        }
      ],
      edges: [
        {
          source: 'a',
          target: 'b'
        },
        {
          source: 'b',
          target: 'c'
        }
      ]
    })
  })

  it('should transform data nested in array with provided mapping', () => {
    const inputData = {
      profiles: [
        {
          _id: 'a',
          data: {
            profile: {
              username: 'Alice',
              url: 'https://alice.com/'
            }
          }
        },
        {
          _id: 'b',
          data: {
            profile: {
              username: 'Bob',
              url: 'https://bob.org/'
            }
          }
        },
        {
          _id: 'c',
          data: {
            profile: {
              username: 'Charlie',
              url: 'https://charlie.net/'
            }
          }
        }
      ],
      edges: [
        ['a', 'b'],
        ['b', 'c']
      ]
    }

    // express the rules as serializable JSON, such that they can be stored in a database
    const jsonRules: JSONMappingSchema = {
      type: 'object',
      properties: {
        nodes: {
          type: 'array',
          value: 'profiles',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', value: '_id' },
              label: { type: 'string', value: 'data.profile.username' }
            }
          }
        },
        edges: {
          type: 'array',
          value: 'edges',
          items: {
            type: 'object',
            properties: {
              source: { type: 'string', value: '0' },
              target: { type: 'string', value: '1' }
            }
          }
        }
      }
    }

    const outputData = transformData(
      {
        result: [inputData]
      },
      jsonRules
    )

    expect(outputData).toEqual({
      nodes: [
        {
          id: 'a',
          label: 'Alice'
        },
        {
          id: 'b',
          label: 'Bob'
        },
        {
          id: 'c',
          label: 'Charlie'
        }
      ],
      edges: [
        {
          source: 'a',
          target: 'b'
        },
        {
          source: 'b',
          target: 'c'
        }
      ]
    })
  })

  it('should transform data with provided mapping and handle nested properties', () => {
    const inputData = {
      elements: {
        rows: [
          {
            id: 'alpha',
            value: {
              _id: 'a',
              attributes: {
                label: 'Alpha',
                description: 'The first letter of the Greek alphabet.'
              }
            }
          },
          {
            id: 'beta',
            value: {
              _id: 'b',
              attributes: {
                label: 'Beta',
                description: 'The second letter of the Greek alphabet.'
              }
            }
          },
          {
            id: 'gamma',
            value: {
              _id: 'c',
              attributes: {
                label: 'Gamma',
                description: 'The third letter of the Greek alphabet.'
              }
            }
          }
        ]
      },
      connections: {
        rows: [
          {
            id: '1',
            key: 'Connection',
            value: {
              _id: '1',
              from_id: 'alpha',
              to_id: 'beta'
            }
          },
          {
            id: '2',
            key: 'Connection',
            value: {
              _id: '2',
              from_id: 'beta',
              to_id: 'gamma'
            }
          }
        ]
      }
    }

    // express the rules as serializable JSON, such that they can be stored in a database
    const jsonRules: JSONMappingSchema = {
      type: 'object',
      properties: {
        nodes: {
          type: 'array',
          value: 'elements.rows',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', value: 'value._id' },
              label: { type: 'string', value: 'value.attributes.label' }
            }
          }
        },
        edges: {
          type: 'array',
          value: 'connections.rows',
          items: {
            type: 'object',
            properties: {
              source: { type: 'string', value: 'value.from_id' },
              target: { type: 'string', value: 'value.to_id' }
            }
          }
        }
      }
    }

    const outputData = transformData(inputData, jsonRules)

    expect(outputData).toEqual({
      nodes: [
        {
          id: 'a',
          label: 'Alpha'
        },
        {
          id: 'b',
          label: 'Beta'
        },
        {
          id: 'c',
          label: 'Gamma'
        }
      ],
      edges: [
        {
          source: 'alpha',
          target: 'beta'
        },
        {
          source: 'beta',
          target: 'gamma'
        }
      ]
    })
  })

  it('should transform data with provided mapping and handle nested properties on an array', () => {
    const inputData = [
      {
        result: [
          {
            matches: [{ id: 'a' }]
          }
        ]
      }
    ]

    // express the rules as serializable JSON, such that they can be stored in a database
    const jsonRules: JSONMappingSchema = {
      type: 'object',
      properties: {
        id: { type: 'string', value: 'result[0].matches[0].id' }
      }
    }

    const outputData = transformData(inputData, jsonRules)

    expect(outputData).toEqual({
      id: 'a'
    })
  })
})
