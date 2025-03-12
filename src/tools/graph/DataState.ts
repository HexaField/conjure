import { defineState, getMutableState, getState } from '@ir-engine/hyperflux'
import { useEffect } from 'react'
import { generateJsonSchema, JSONSchema } from './functions/generateJsonSchema'
import { transformData } from './functions/transformData'
import { allRequirementsMet, flattenSchema } from './SchemaDisplay'

export type Tool<Async = boolean> = {
  id: string
  label: string
  input: JSONSchema
  output: JSONSchema
  isAsync: Async
  // Each of the args satisfies the corresponding input schema
  // The return values satisfies the output schema
  implementation: (
    args: Record<string, any>,
    abortController?: AbortController
  ) => Async extends true ? Promise<any> : any
}

export const DataToolRegistry = defineState({
  name: 'hexafield.conjure.DataToolRegistry',
  initial: {} as Record<string, Tool>,
  tool: (toolID: string) => getState(DataToolRegistry)[toolID].implementation,
  reactor: () => {
    useEffect(() => {
      for (const tool of CoreTools)
        getMutableState(DataToolRegistry).merge({
          [tool.id]: tool
        })
      for (const pipeline of Pipelines)
        getMutableState(DataToolRegistry).merge({
          [pipeline.id]: pipeline
        })
    }, [])

    return null
  }
})

export type TargetSchema<T> = {
  id: string
  label: string
  value: JSONSchema
  onData: (data: Record<string, Partial<T>>) => T
  onConfirm: (data: T) => void
}

export const TargetVisualizationState = defineState({
  name: 'hexafield.conjure.graph-tool.TargetSchemaState',
  initial: {} as Record<string, TargetSchema<any>>
})

export const SourceFetchTool = {
  id: 'core.source-fetch',
  label: 'Fetch Source',
  input: { type: 'object', properties: { url: { type: 'string' } } },
  output: { type: 'object', properties: { schema: { type: 'object' }, data: { type: 'object' } } },
  isAsync: true,
  implementation: (args: { url: string }, abortController) => {
    if (!abortController) abortController = new AbortController()
    return new Promise<{ schema: JSONSchema; data: any }>((resolve, reject) => {
      fetch(args.url, { signal: abortController.signal })
        .then((response) => {
          if (abortController.signal.aborted) return
          response
            .json()
            .then((data) => {
              if (abortController.signal.aborted) return
              const schema = generateJsonSchema(data)
              resolve({ schema, data })
            })
            .catch((error) => {
              console.error(error)
              reject(error)
            })
        })
        .catch((error) => {
          console.error(error)
          reject(error)
        })
    })
  }
}

export const SchemaFlattenTool = {
  id: 'core.schema-flatten',
  label: 'Flatten Schema',
  input: { type: 'object', properties: { schema: { type: 'object' }, data: { type: 'object' } } },
  output: { type: 'object' },
  isAsync: false,
  implementation: (args: { schema: JSONSchema; data: any }) => {
    const { schema, data } = args
    const flattenedData = flattenSchema(schema, '', data)
    return { flattenedData }
  }
}

export const MappingRequirementsTool = {
  id: 'mapping-requirements',
  label: 'Mapping Requirements',
  input: { type: 'object', properties: { targetSchema: { type: 'object' }, mapping: { type: 'object' } } },
  output: { type: 'object', properties: { meetsRequirements: { type: 'boolean' } } },
  isAsync: false,
  implementation: (args: { targetSchema: JSONSchema; mapping: any }) => {
    const { targetSchema, mapping } = args
    const requirements = allRequirementsMet(targetSchema, mapping)
    if (!requirements) {
      return { meetsRequirements: false }
    }
    return { meetsRequirements: true }
  }
}

export const MappedTransformationTool = {
  id: 'core.mapped-transformation',
  label: 'Mapped Transformation',
  input: { type: 'object', properties: { mapping: { type: 'object' }, data: { type: 'object' } } },
  output: { type: 'object', properties: { transformedData: { type: 'object' } } },
  isAsync: false,
  implementation: (args: { mapping: any; data: any }) => {
    const { mapping, data } = args
    const transformedData = transformData(mapping, data)
    return { transformedData }
  }
}

export const VisualizationTool = {
  id: 'core.visualization',
  label: 'Visualization',
  input: { type: 'object', properties: { type: { type: 'string' }, data: { type: 'object' } } },
  output: { type: 'object', properties: { combinedData: { type: 'object' } } },
  isAsync: false,
  implementation: (args: { type: string; data: any }) => {
    const { type, data } = args
    const combinedData = getState(TargetVisualizationState)[type].onData(data)

    // side effect - start visualization
    getState(TargetVisualizationState)[type].onConfirm(combinedData)

    return { combinedData }
  }
}

const CoreTools: Tool[] = [
  SourceFetchTool,
  SchemaFlattenTool,
  MappingRequirementsTool,
  MappedTransformationTool,
  VisualizationTool
]

export const MultiSourceMappingVisualizationPipeline = {
  id: 'core.multi-source-mapping-visualization',
  label: 'Multi Source Mapping Visualization Pipeline',
  input: {
    type: 'object',
    properties: { type: { type: 'string' }, sources: { type: 'array' }, mapping: { type: 'object' } }
  },
  output: { type: 'object', properties: { result: { type: 'object' } } },
  isAsync: true,
  implementation: async (args: { type: string; sources: string[]; mapping: any }, abortController) => {
    const { type, sources, mapping } = args
    const { schema, data } = await SourceFetchTool.implementation({ url: sources[0] }, abortController)
    const targetSchema = getState(TargetVisualizationState)[type].value
    const { meetsRequirements } = MappingRequirementsTool.implementation({ targetSchema, mapping })
    if (!meetsRequirements) {
      throw new Error('Mapping does not meet requirements')
    }
    const { transformedData } = MappedTransformationTool.implementation({ mapping, data })
    const { combinedData } = VisualizationTool.implementation({ type, data: { [sources[0]]: transformedData } })
    return { result: combinedData }
  }
}

const Pipelines: Tool[] = [MultiSourceMappingVisualizationPipeline]

/**
 * @todo maybe consider changing from arrays to an object...
 */
