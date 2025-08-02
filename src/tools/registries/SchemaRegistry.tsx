import { defineState, getMutableState, none, syncStateWithLocalStorage } from '@ir-engine/hyperflux'
import { JSONSchemaType } from '../json-schema/JSONSchema'
import { contentHash } from '../json-schema/contentHash'

export type SHA256Hash = string

export type SchemaType<Data = unknown> = {
  hash: SHA256Hash
  label: string
  description: string
  schema: JSONSchemaType<Data>
}

export const SchemaRegistry = defineState({
  name: 'hexafield.conjure.SchemaRegistry',
  initial: { schemas: {} as Record<SHA256Hash, SchemaType> },

  register: (schema: JSONSchemaType<unknown>, label?: string, description?: string) => {
    const hash = contentHash(schema)
    getMutableState(SchemaRegistry).schemas[hash].set({
      hash,
      label: label || 'Untitled',
      description: description || 'No description',
      schema
    })
  },

  forget: (hash: SHA256Hash) => {
    getMutableState(SchemaRegistry).schemas[hash].set(none)
  },

  extension: syncStateWithLocalStorage(['schemas'])
})
