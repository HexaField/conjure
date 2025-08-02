import { defineState, getMutableState } from '@ir-engine/hyperflux'
import { JSONSchemaType } from '../json-schema/JSONSchema'
import { SchemaRegistry } from '../registries/SchemaRegistry'

export type TargetSchema<T> = {
  id: string
  label: string
  value: JSONSchemaType<T>
  onData: (data: Record<string, Partial<T>>) => T
  onConfirm: (data: T) => void
}

export const TargetRegistry = defineState({
  name: 'hexafield.conjure.TargetRegistry',
  initial: {} as Record<string, TargetSchema<any>>,

  register: (tool: TargetSchema<any>) => {
    SchemaRegistry.register(
      tool.value as any as JSONSchemaType<unknown>,
      tool.label,
      tool.value.description || 'No description'
    )
    getMutableState(TargetRegistry).merge({ [tool.id]: tool })
  }
})
