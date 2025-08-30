import type { CRUD_API } from './CRUD'

const url = 'https://localhost:8000'

export const LocalBlobAPI: CRUD_API = {
  create: async (args) => {
    const form = new FormData()
    form.append('source', args.source)
    form.append('predicate', args.predicate)
    form.append('fileName', args.fileName)
    form.append('fileType', args.fileType)
    form.append('file', args.file, args.fileName)

    const response = await fetch(`${url}/create`, { method: 'POST', body: form })
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
    return response.blob()
  },

  has: async (args) => {
    const response = await fetch(`${url}/has`, {
      method: 'POST',
      body: JSON.stringify(args),
      headers: { 'Content-Type': 'application/json' }
    })
    if (!response.ok) throw new Error('Failed to check blob existence')
    return response.json()
  },

  find: async (args) => {
    const response = await fetch(`${url}/find`, {
      method: 'POST',
      body: JSON.stringify(args),
      headers: { 'Content-Type': 'application/json' }
    })
    if (!response.ok) throw new Error('Failed to find blobs')
    return response.json()
  },

  replace: async (args) => {
    const form = new FormData()
    form.append('source', args.source)
    form.append('predicate', args.predicate)
    form.append('fileName', args.fileName)
    form.append('fileType', args.fileType)
    form.append('file', args.file, args.fileName)

    const response = await fetch(`${url}/replace`, { method: 'POST', body: form })
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
