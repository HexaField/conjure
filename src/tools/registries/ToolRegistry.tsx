import transform from '@hexafield/jsonpath-object-transform'
import { defineState, getMutableState, getState, NO_PROXY, none, useMutableState } from '@ir-engine/hyperflux'
import React, { useEffect } from 'react'
import { P2P_API } from '../../api/CRUD'
import { JSONSchemaType } from '../json-schema/JSONSchema'
import { contentHash, contentHashJSONSchema } from '../json-schema/contentHash'
import { createDynamicWebworker } from '../utils/createDynamicWebworker'
import { hashFunctionSource } from '../utils/hashFunction'
import { SchemaRegistry, SHA256Hash } from './SchemaRegistry'

export const TOOL_PREDICATE = 'conjure://tool'

export type Stringify<Signature = unknown> = string & {
  __fnSignature: Signature
}

export type FunctionHash = string

export type Tool<Input = unknown, Output = unknown, TransformSchema = object | undefined> = {
  hash: SHA256Hash
  label: string
  description: string
  input: JSONSchemaType<Input>
  output: JSONSchemaType<Output>
  transformation: Stringify<(input: Input) => Promise<Output>> | TransformSchema
  inputHash: SHA256Hash
  outputHash: SHA256Hash
  transformationHash: SHA256Hash | FunctionHash
}

export const ToolRegistry = defineState({
  name: 'hexafield.conjure.ToolRegistry',
  initial: { tools: {} as Record<SHA256Hash, Tool> },

  create: async (tool: Omit<Tool, 'hash' | 'inputHash' | 'outputHash' | 'transformationHash'>): Promise<SHA256Hash> => {
    const { label, description, input, output, transformation } = tool

    const inputHash = contentHashJSONSchema(input as any /**@todo unify json schema types */) as SHA256Hash
    const outputHash = contentHashJSONSchema(output as any /**@todo unify json schema types */) as SHA256Hash
    const transformationHash =
      typeof transformation === 'string'
        ? ((await hashFunctionSource(transformation)) as FunctionHash)
        : (contentHash(transformation) as SHA256Hash)
    const hash = contentHash({
      input: inputHash,
      output: outputHash,
      transformation: transformationHash
    }) as SHA256Hash

    const serializedTool = {
      hash,
      label,
      description,
      input,
      output,
      transformation,
      inputHash,
      outputHash,
      transformationHash
    }

    console.log('Registered tool:', label)

    getMutableState(ToolRegistry).tools[serializedTool.hash].set(serializedTool)

    return serializedTool.hash
  },

  forget: (hash: SHA256Hash) => {
    getMutableState(ToolRegistry).tools[hash].set(none)

    if (!P2P_API.client) return
    P2P_API.client.delete({ source: hash, predicate: TOOL_PREDICATE }).then(async () => {
      console.log('deleted:', hash)
    })
  },

  run: async <Input, Output>(hash: SHA256Hash, input: Input): Promise<Output> => {
    const tool = getState(ToolRegistry).tools[hash]
    if (!tool) {
      throw new Error(`Tool with hash ${hash} not found`)
    }
    const { transformation } = tool

    if (typeof transformation === 'object') {
      return transform(input, transformation) as Output
    }

    if (typeof transformation !== 'string') {
      throw new Error(`Tool with hash ${hash} has invalid transformation function`)
    }

    if (!workers[hash]) {
      console.warn(`Creating new worker for tool ${hash}`)
      workers[hash] = await createDynamicWebworker(transformation)
    }

    const worker = workers[hash]
    try {
      return (await worker.call(input as object)) as Output
    } catch (error) {
      worker.terminate()
      delete workers[hash]
      throw error
    }
  },

  reactor: () => {
    const toolState = useMutableState(ToolRegistry).tools
    const apiReady = useMutableState(P2P_API).ready.value

    useEffect(() => {
      if (!apiReady) return
      P2P_API.client.find({ predicate: TOOL_PREDICATE }).then((sources) => {
        sources.forEach(async (source) => {
          P2P_API.client
            .get({ source, predicate: TOOL_PREDICATE })
            .then(async (response: object) => {
              if (!response) return
              const { label, description, input, output, transformation } = response as Tool
              ToolRegistry.create({
                label,
                description,
                input,
                output,
                transformation
              })
            })
            .catch((e) => {
              console.error('Failed to retrieve schema:', e)
            })
        })
      })
    }, [apiReady])

    return (
      <>
        {toolState.keys.map((key) => (
          <SyncTool key={key} hash={key} />
        ))}
      </>
    )
  }
})

const SyncTool = ({ hash }: { hash: string }) => {
  const tool = useMutableState(ToolRegistry).tools[hash].get(NO_PROXY)
  const apiReady = useMutableState(P2P_API).ready.value

  useEffect(() => {
    if (!getState(SchemaRegistry).schemas[tool.inputHash])
      SchemaRegistry.register(tool.input as JSONSchemaType<unknown>, tool.label, tool.description)
    if (!getState(SchemaRegistry).schemas[tool.outputHash])
      SchemaRegistry.register(tool.output as JSONSchemaType<unknown>, tool.label, tool.description)

    if (!apiReady) return

    P2P_API.client.has({ source: hash, predicate: TOOL_PREDICATE }).then(async (exists) => {
      if (exists) return
      P2P_API.client
        .create({
          predicate: TOOL_PREDICATE,
          source: hash,
          target: {
            hash: tool.hash,
            label: tool.label,
            description: tool.description,
            input: tool.input,
            output: tool.output,
            transformation: tool.transformation,
            inputHash: tool.inputHash,
            outputHash: tool.outputHash,
            transformationHash: tool.transformationHash
          }
        })
        .catch((e) => {
          console.error('Failed to create tool:', e)
        })
    })
  }, [
    apiReady,
    tool.inputHash,
    tool.outputHash,
    tool.input,
    tool.output,
    tool.label,
    tool.description,
    tool.hash,
    tool.transformation,
    tool.transformationHash
  ])

  return null
}

const workers = {} as Record<SHA256Hash, Awaited<ReturnType<typeof createDynamicWebworker>>>
