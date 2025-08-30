import type { CRUD_API, QueryParams } from './CRUD'

const conjureCacheKey = 'CONJURE_STORAGE_CACHE'

const localCache = { entries: {} as Record<string, string>, predicateIndex: {} as Record<string, string[]> }
globalThis.localCache = localCache

const saveCache = () => {
  localStorage.setItem(conjureCacheKey, JSON.stringify(localCache.entries))
}

const loadCache = () => {
  const cached = localStorage.getItem(conjureCacheKey)
  if (cached) {
    const parsed = JSON.parse(cached)
    for (const key in parsed) {
      localCache.entries[key] = parsed[key]
    }
  }
  localCache.predicateIndex = Object.keys(localCache.entries).reduce(
    (acc, key) => {
      const [predicate] = key.split('__')
      if (!acc[predicate]) {
        acc[predicate] = []
      }
      acc[predicate].push(key)
      return acc
    },
    {} as Record<string, string[]>
  )
}

loadCache()

const keyFor = ({ source, predicate }: QueryParams) => `${encodeURIComponent(predicate)}__${encodeURIComponent(source)}`

export const LocalBlobAPI: CRUD_API = {
  create: async (args) => {
    const key = keyFor(args)
    localCache.entries[key] = JSON.stringify(args.target)
    saveCache()
  },

  get: async (args) => {
    const key = keyFor(args)
    const value = localCache.entries[key]
    return value ? JSON.parse(value) : undefined
  },

  has: async (args) => {
    const key = keyFor(args)
    return localCache.entries[key] !== undefined
  },

  find: async (args) => {
    const encodedPredicate = encodeURIComponent(args.predicate)
    const results = [] as string[]
    for (const key of localCache.predicateIndex[encodedPredicate] || []) {
      const value = localCache.entries[key]
      if (typeof value === 'string') {
        results.push(decodeURIComponent(key.slice(encodedPredicate.length + 2)))
      }
    }
    return results
  },

  replace: async (args) => {
    const key = keyFor(args)
    localCache.entries[key] = JSON.stringify(args.target)
    saveCache()
  },

  delete: async (args) => {
    const key = keyFor(args)
    delete localCache.entries[key]
    saveCache()
  }
}
