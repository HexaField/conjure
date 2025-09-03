import { defineState, getMutableState, getState } from '@ir-engine/hyperflux'
import { JSONSchemaType } from '../json-schema/JSONSchema'
import { SchemaRegistry } from '../registries/SchemaRegistry'

export type TargetSchema<T> = {
  hash: string
  label: string
  value: JSONSchemaType<T>
  deserialize: (data: T) => void
}

export type TargetSchemaDefinition<T> = Omit<TargetSchema<T>, 'hash'>

export const TargetRegistry = defineState({
  name: 'hexafield.conjure.TargetRegistry',
  initial: {} as Record<string, TargetSchema<any>>,

  register: <T extends any>(tool: Omit<TargetSchema<T>, 'hash'>) => {
    const hash = SchemaRegistry.register(
      tool.value as any as JSONSchemaType<any>,
      tool.label,
      tool.value.description || 'No description'
    )
    getMutableState(TargetRegistry).merge({
      [hash]: {
        ...tool,
        hash
      } as TargetSchema<any>
    })
  },

  run: <T extends any>(hash: string, data: T) => {
    const target = getState(TargetRegistry)[hash]
    if (!target) throw new Error(`Tool not found: ${hash}`)
    return target.deserialize(data)
  }
})
