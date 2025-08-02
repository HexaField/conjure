import { useHookstate } from '@hookstate/core'
import { defineState, getMutableState, getState } from '@ir-engine/hyperflux'
import { useEffect } from 'react'
import { JSONSchemaType } from '../json-schema/JSONSchema'
import { SchemaRegistry } from '../SchemaRegistry'

export type TargetSchema<T> = {
  id: string
  label: string
  value: JSONSchemaType<T>
  onData: (data: Record<string, Partial<T>>) => T
  onConfirm: (data: T) => void
}

export const TargetVisualizationState = defineState({
  name: 'hexafield.conjure.graph-tool.TargetSchemaState',
  initial: {} as Record<string, TargetSchema<any>>,

  reactor: () => {
    const state = useHookstate(getMutableState(TargetVisualizationState))

    useEffect(() => {
      const tools = getState(TargetVisualizationState)
      for (const [hash, tool] of Object.entries(tools)) {
        SchemaRegistry.register(
          tool.value as any as JSONSchemaType<unknown>,
          '3D Force Graph',
          '3D force-directed graph visualization'
        )
      }
    }, [state])
  }
})
