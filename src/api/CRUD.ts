import { defineState } from '@ir-engine/hyperflux'

export type QueryParams = {
  source: string
  predicate: string
}

export type FileParams = QueryParams & {
  file: Blob
  fileName: string
  fileType: string
}

export type CRUD_API = {
  create: (args: FileParams) => Promise<void>
  get: (args: QueryParams) => Promise<Blob | undefined>
  has: (args: QueryParams) => Promise<boolean>
  find: (args: { predicate: string }) => Promise<string[]> // Find files by predicate, returns list of sources
  replace: (args: FileParams) => Promise<void>
  delete: (args: QueryParams) => Promise<void>
}

export const P2P_API = defineState({
  name: 'hexafield.conjure.P2P_API',
  initial: { ready: false },
  client: null! as CRUD_API
})
