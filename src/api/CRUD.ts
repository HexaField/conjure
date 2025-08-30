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
  replace: (args: FileParams) => Promise<void>
  delete: (args: QueryParams) => Promise<void>
}

export const P2P_API = {
  client: null! as CRUD_API
}
