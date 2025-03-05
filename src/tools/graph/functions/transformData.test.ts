import jsonTransform from 'json-transforms'
import { describe, expect, it } from 'vitest'
import { transformData } from './transformData'

// Tests

describe('transformData', () => {
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

  it('should transform data with hardcoded rules', () => {
    // hard-coded rules for the example
    const nodesRule = [
      jsonTransform.pathRule('.profiles', (d) => {
        return d.runner()
      }),
      jsonTransform.pathRule('.', (d) => {
        return {
          id: d.context._id,
          label: d.context.data.profile.username
        }
      })
    ]

    const edgesRule = [
      jsonTransform.pathRule('.edges', (d) => {
        return d.runner()
      }),
      jsonTransform.pathRule('.', (d) => {
        return {
          source: d.context[0],
          target: d.context[1]
        }
      })
    ]

    const exampleRules = {
      nodes: nodesRule,
      edges: edgesRule
    }

    const exampleOutputData = Object.fromEntries(
      Object.entries(exampleRules).map(([prompt, rule]) => [prompt, jsonTransform.transform(inputData, rule)])
    )

    expect(exampleOutputData).toEqual({
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

  it('should transform data with provided mapping', () => {
    // express the rules as serializable JSON, such that they can be stored in a database
    const jsonRules = {
      nodes: [
        {
          id: 'profiles._id',
          label: 'profiles.data.profile.username'
        }
      ],
      edges: [
        {
          source: 'edges.0',
          target: 'edges.1',
          weight: '' // empty string to indicate that this field is not present in the input data
        }
      ]
    }

    const outputData = transformData(jsonRules, inputData)

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
    const jsonRules = {
      nodes: [
        {
          id: 'elements.rows.value._id',
          label: 'elements.rows.value.attributes.label'
        }
      ],
      edges: [
        {
          source: 'connections.rows.value.from_id',
          target: 'connections.rows.value.to_id'
        }
      ]
    }

    const outputData = transformData(jsonRules, inputData)

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
})
