import { defineState, getMutableState } from '@ir-engine/hyperflux'
import { JSONSchemaType } from '../json-schema/JSONSchema'
import { SchemaRegistry } from '../registries/SchemaRegistry'

export type TargetSchema<T> = {
  hash: string
  label: string
  value: JSONSchemaType<T>
  deserialize: (data: Record<string, Partial<T>>) => void
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
  }
})
