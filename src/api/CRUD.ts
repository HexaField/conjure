import { defineState } from '@ir-engine/hyperflux'

export type QueryParams = {
  source: string
  predicate: string
}

export type RDFParams = QueryParams & {
  target: TargetType
}

export type TargetType = string | object | boolean | number

export type CRUD_API = {
  create: (args: RDFParams) => Promise<void>
  get: (args: QueryParams) => Promise<TargetType | undefined>
  has: (args: QueryParams) => Promise<boolean>
  find: (args: { predicate: string }) => Promise<string[]> // Find files by predicate, returns list of sources
  replace: (args: RDFParams) => Promise<void>
  delete: (args: QueryParams) => Promise<void>
}

export const P2P_API = defineState({
  name: 'hexafield.conjure.P2P_API',
  initial: { ready: false },
  client: null! as CRUD_API
})
