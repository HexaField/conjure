import type { CRUD_API } from './CRUD'

const url = 'https://localhost:8000'

export const ServerBlobAPI: CRUD_API = {
  create: async (args) => {
    const response = await fetch(`${url}/create`, {
      method: 'POST',
      body: JSON.stringify({
        source: args.source,
        predicate: args.predicate,
        target: JSON.stringify(args.target)
      }),
      headers: { 'Content-Type': 'application/json' }
    })
    if (!response.ok) throw new Error('Failed to create blob')
  },

  get: async (args) => {
    const response = await fetch(`${url}/get`, {
      method: 'POST',
      body: JSON.stringify(args),
      headers: { 'Content-Type': 'application/json' }
    })
    if (response.status === 404) return undefined
    if (!response.ok) throw new Error('Failed to get blob')
    const json = await response.json()
    return json.target
  },

  has: async (args) => {
    const response = await fetch(`${url}/has`, {
      method: 'POST',
      body: JSON.stringify(args),
      headers: { 'Content-Type': 'application/json' }
    })
    return (await response.json()).ok
  },

  find: async (args) => {
    const response = await fetch(`${url}/find`, {
      method: 'POST',
      body: JSON.stringify(args),
      headers: { 'Content-Type': 'application/json' }
    })
    if (!response.ok) throw new Error('Failed to find blobs')
    return (await response.json()).results
  },

  replace: async (args) => {
    const response = await fetch(`${url}/replace`, {
      method: 'POST',
      body: JSON.stringify({
        source: args.source,
        predicate: args.predicate,
        target: JSON.stringify(args.target)
      }),
      headers: { 'Content-Type': 'application/json' }
    })
    if (!response.ok) throw new Error('Failed to replace blob')
  },

  delete: async (args) => {
    const response = await fetch(`${url}/delete`, {
      method: 'POST',
      body: JSON.stringify(args),
      headers: { 'Content-Type': 'application/json' }
    })
    if (response.status !== 404 && !response.ok) throw new Error('Failed to delete blob')
  }
}
