import { defineState, getMutableState, getState } from '@ir-engine/hyperflux'
import { useEffect } from 'react'
import { generateJsonSchema, JSONSchema } from './functions/generateJsonSchema'
import { transformData } from './functions/transformData'
import { allRequirementsMet, flattenSchema } from './SchemaDisplay'

export type Tool<Async = boolean> = {
  id: string
  label: string
  input: JSONSchema[]
  output: JSONSchema[]
  isAsync: Async
  // Each of the args satisfies the corresponding input schema
  // The return values satisfies the output schema
  implementation: (args: any[], abortController?: AbortController) => Async extends true ? Promise<any[]> : any[]
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
  input: [{ type: 'string' }],
  output: [{ type: 'object' }, { type: 'object' }],
  isAsync: true,
  implementation: (args: [string], abortController) => {
    if (!abortController) abortController = new AbortController()
    return new Promise<[JSONSchema, any]>((resolve, reject) => {
      fetch(args[0], { signal: abortController.signal })
        .then((response) => {
          if (abortController.signal.aborted) return
          response
            .json()
            .then((data) => {
              if (abortController.signal.aborted) return
              const schema = generateJsonSchema(data)
              resolve([schema, data])
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
  input: [{ type: 'object' }, { type: 'object' }],
  output: [{ type: 'object' }],
  isAsync: false,
  implementation: (args: [JSONSchema, any]) => {
    const [schema, data] = args
    const flattenedData = flattenSchema(schema, '', data)
    return [flattenedData]
  }
}

export const MappingRequirementsTool = {
  id: 'mapping-requirements',
  label: 'Mapping Requirements',
  input: [{ type: 'object' }, { type: 'object' }],
  output: [{ type: 'boolean' }],
  isAsync: false,
  implementation: (args: [JSONSchema, any]) => {
    const [targetSchema, mapping] = args
    const requirements = allRequirementsMet(targetSchema, mapping)
    if (!requirements) {
      return [false]
    }
    return [true]
  }
}

export const MappedTransformationTool = {
  id: 'core.mapped-transformation',
  label: 'Mapped Transformation',
  input: [{ type: 'object' }, { type: 'object' }],
  output: [{ type: 'object' }],
  isAsync: false,
  implementation: (args: [JSONSchema, any]) => {
    const [mapping, data] = args
    const transformedData = transformData(mapping, data)
    return [transformedData]
  }
}

export const VisualizationTool = {
  id: 'core.visualization',
  label: 'Visualization',
  input: [{ type: 'string' }, { type: 'object' }],
  output: [{ type: 'object' }],
  isAsync: false,
  implementation: (args: [string, any]) => {
    const [type, data] = args
    const combinedData = getState(TargetVisualizationState)[type].onData(data)

    // side effect - start visualization
    getState(TargetVisualizationState)[type].onConfirm(combinedData)

    return [combinedData]
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
  input: [{ type: 'string' }, { type: 'object' }, { type: 'object' }],
  output: [{ type: 'object' }],
  isAsync: true,
  implementation: async (args: [string, any, JSONSchema], abortController) => {
    const [type, sources, mapping] = args
    const [schema, data] = await SourceFetchTool.implementation([sources[0]], abortController)
    const targetSchema = getState(TargetVisualizationState)[type].value
    const [requirementsMet] = MappingRequirementsTool.implementation([targetSchema, mapping])
    if (!requirementsMet) {
      return [{ error: 'Requirements not met' }]
    }
    const [transformed] = MappedTransformationTool.implementation([mapping, data])
    const [visualizationData] = VisualizationTool.implementation([type, { [sources[0]]: transformed }])
    return [visualizationData]
  }
}

const Pipelines: Tool[] = [MultiSourceMappingVisualizationPipeline]

/**
 * @todo maybe consider changing from arrays to an object...
 */
