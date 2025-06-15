import {
  defineState,
  getMutableState,
  getState,
  none,
  syncStateWithLocalStorage,
  useHookstate
} from '@ir-engine/hyperflux'
import { useEffect } from 'react'
import { SchemaRegistry, SHA256Hash } from './SchemaRegistry'
import { JSONSchemaType } from './json-schema/JSONSchema'
import { contentHash } from './json-schema/contentHash'
import { createDynamicWebworker } from './utils/createDynamicWebworker'
import { hashFunctionSource } from './utils/hashFunction'

export type Stringify<Signature = unknown> = string & {
  __fnSignature: Signature
}

export type FunctionHash = string

export type Tool<Input = unknown, Output = unknown> = {
  hash: SHA256Hash
  label: string
  description: string
  input: JSONSchemaType<Input>
  output: JSONSchemaType<Output>
  transformation: Stringify<(input: Input) => Promise<Output>>
  inputHash: SHA256Hash
  outputHash: SHA256Hash
  transformationHash: FunctionHash
}

export const ToolRegistry = defineState({
  name: 'hexafield.conjure.ToolRegistry',
  initial: { tools: {} as Record<SHA256Hash, Tool> },

  create: async (tool: Omit<Tool, 'hash' | 'inputHash' | 'outputHash' | 'transformationHash'>): Promise<SHA256Hash> => {
    const { label, description, input, output, transformation } = tool

    const inputHash = contentHash(input) as SHA256Hash
    const outputHash = contentHash(output) as SHA256Hash
    const transformationHash = (await hashFunctionSource(transformation)) as FunctionHash
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
      transformation: transformation as Stringify<(input: unknown) => Promise<unknown>>,
      inputHash,
      outputHash,
      transformationHash
    }

    getMutableState(ToolRegistry).tools[serializedTool.hash].set(serializedTool)

    return serializedTool.hash
  },

  forget: (hash: SHA256Hash) => {
    getMutableState(ToolRegistry).tools[hash].set(none)
  },

  run: async <Input, Output>(hash: SHA256Hash, input: Input): Promise<Output> => {
    const tool = getState(ToolRegistry).tools[hash]
    if (!tool) {
      throw new Error(`Tool with hash ${hash} not found`)
    }
    const { transformation } = tool
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

  extension: syncStateWithLocalStorage(['tools']),

  reactor: () => {
    const state = useHookstate(getMutableState(ToolRegistry).tools)

    useEffect(() => {
      const tools = getState(ToolRegistry).tools
      for (const [hash, tool] of Object.entries(tools)) {
        SchemaRegistry.register(tool.input, 'Unknown', 'Unknown tool schema')
        SchemaRegistry.register(tool.output, 'Unknown', 'Unknown tool schema')
      }
    }, [state])
  }
})

const workers = {} as Record<SHA256Hash, Awaited<ReturnType<typeof createDynamicWebworker>>>
