import { defineState, getMutableState, NO_PROXY, none, useMutableState } from '@ir-engine/hyperflux'
import React, { useEffect } from 'react'
import { P2P_API } from '../../api/CRUD'
import { JSONSchemaType } from '../json-schema/JSONSchema'
import { contentHash } from '../json-schema/contentHash'
import { registerKnownSchemas } from '../schemas/KnownSchemas'

export const SCHEMA_PREDICATE = 'conjure://schema'

export type SHA256Hash = string

export type SchemaType<Data = any> = {
  hash: SHA256Hash
  label: string
  description: string
  schema: JSONSchemaType<Data>
}

export const SchemaRegistry = defineState({
  name: 'hexafield.conjure.SchemaRegistry',
  initial: { schemas: {} as Record<SHA256Hash, SchemaType> },

  register: (schema: JSONSchemaType<any>, label?: string, description?: string) => {
    const hash = contentHash(schema)
    getMutableState(SchemaRegistry).schemas[hash].set({
      hash,
      label: label || 'Untitled',
      description: description || 'No description',
      schema
    })
    return hash
  },

  forget: (hash: SHA256Hash) => {
    getMutableState(SchemaRegistry).schemas[hash].set(none)
    if (!P2P_API.client) return
    P2P_API.client.delete({ source: hash, predicate: SCHEMA_PREDICATE }).then(async () => {
      console.log('deleted:', hash)
    })
  },

  reactor: () => {
    const schemaState = useMutableState(SchemaRegistry).schemas
    const apiReady = useMutableState(P2P_API).ready.value

    useEffect(() => {
      registerKnownSchemas()
    }, [])

    useEffect(() => {
      if (!apiReady) return
      P2P_API.client.find({ predicate: SCHEMA_PREDICATE }).then((sources) => {
        sources.forEach(async (source) => {
          P2P_API.client
            .get({ source, predicate: SCHEMA_PREDICATE })
            .then(async (response: object) => {
              if (!response) return
              const { schema, label, description } = response as any
              SchemaRegistry.register(schema, label, description)
            })
            .catch((e) => {
              console.error('Failed to retrieve schema:', e)
            })
        })
      })
    }, [apiReady])

    if (!apiReady) return null

    return (
      <>
        {schemaState.keys.map((key) => (
          <SyncSchema key={key} hash={key} />
        ))}
      </>
    )
  }
})

const SyncSchema = ({ hash }: { hash: string }) => {
  const schema = useMutableState(SchemaRegistry).schemas[hash].get(NO_PROXY)

  useEffect(() => {
    P2P_API.client.has({ source: hash, predicate: SCHEMA_PREDICATE }).then(async (exists) => {
      if (exists) return
      P2P_API.client
        .create({
          predicate: SCHEMA_PREDICATE,
          source: hash,
          target: { schema: schema.schema, label: schema.label, description: schema.description }
        })
        .catch((e) => {
          console.error('Failed to create schema:', e)
        })
    })
  }, [JSON.stringify(schema)])

  return null
}
