import { compileSchema, SchemaNode } from 'json-schema-library'
import React, { useEffect } from 'react'

import { defineState, getMutableState, getState, NO_PROXY, none, useMutableState } from '@ir-engine/hyperflux'

import { P2P_API } from '../../api/CRUD'
import { JSONSchemaType } from '../json-schema/JSONSchema'
import { contentHashJSONSchema } from '../json-schema/contentHash'
import { generateJsonSchema } from '../json-schema/generateJsonSchema'
import { registerKnownSchemas } from '../schemas/KnownSchemas'

export const SCHEMA_PREDICATE = 'conjure://schema'

export type SHA256Hash = string

export type SchemaType<Data = any> = {
  hash: SHA256Hash
  label: string
  description: string
  schema: JSONSchemaType<Data>
}

const validators = {} as Record<SHA256Hash, SchemaNode>

export const SchemaRegistry = defineState({
  name: 'hexafield.conjure.SchemaRegistry',
  initial: { schemas: {} as Record<SHA256Hash, SchemaType> },

  register: (schema: JSONSchemaType<any>, label?: string, description?: string) => {
    const hash = contentHashJSONSchema(schema as any /**@todo unify json schema types */)
    console.log('Registered schema:', label)
    if (getState(SchemaRegistry).schemas[hash]) return hash // don't overwrite existing schemas
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

  /**
   * Find a schema that does not fail validation for an incoming data object.
   */
  findMatchingSchema: (data: any) => {
    const schemaState = getState(SchemaRegistry).schemas
    const matchingHash = Object.keys(schemaState).find((hash: SHA256Hash) => {
      const schema = schemaState[hash]
      if (!validators[hash]) {
        validators[hash] = compileSchema(schema.schema)
      }
      try {
        const { valid } = validators[hash].validate(data)
        return valid
      } catch (e) {
        // validation failed
        return null
      }
    })
    return matchingHash
  },

  findOrGenerateMatchingSchema: (data: any, label?: string, description?: string) => {
    const existingSchema = SchemaRegistry.findMatchingSchema(data)
    if (existingSchema) return getState(SchemaRegistry).schemas[existingSchema]
    const newSchema = generateJsonSchema(data)
    SchemaRegistry.register(newSchema, label, description)
    return newSchema
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
  }, [schema.description, schema.label, schema.schema])

  return null
}
