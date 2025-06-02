import { defineState } from '@ir-engine/hyperflux'
import { JSONSchemaType } from './json-schema/JSONSchema'
import { contentHash } from './json-schema/contentHash'
import { hashFunctionSource } from './utils/hashFunction'

export type Stringify<Signature = unknown> = string & {
  __fnSignature: Signature
}

export type SHA256Hash = string
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
  initial: {} as Record<SHA256Hash, Tool>,

  create: async (tool: Omit<Tool, 'hash' | 'inputHash' | 'outputHash' | 'transformationHash'>): Promise<Tool> => {
    const { label, description, input, output, transformation } = tool

    const inputHash = contentHash(input) as SHA256Hash
    const outputHash = contentHash(output) as SHA256Hash
    const transformationHash = (await hashFunctionSource(transformation)) as FunctionHash
    const id = contentHash({
      input: inputHash,
      output: outputHash,
      transformation: transformationHash
    }) as SHA256Hash

    return {
      hash: id,
      label,
      description,
      input,
      output,
      transformation: transformation as Stringify<(input: unknown) => Promise<unknown>>,
      inputHash,
      outputHash,
      transformationHash
    }
  }
})
