import {
  defineState,
  getMutableState,
  getNestedObject,
  getState,
  setNestedObject,
  useHookstate
} from '@ir-engine/hyperflux'
import { useEffect } from 'react'
import { SchemaRegistry } from '../SchemaRegistry'
import { JSONSchemaType } from '../json-schema/JSONSchema'
import { allRequirementsMet } from './functions/allRequirementsMet'
import { flattenSchema } from './functions/flattenSchema'
import { generateJsonSchema, JSONMappingSchema, JSONSchema } from './functions/generateJsonSchema'
import { transformData } from './functions/transformData'

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

export const SourceFetchTool = {
  id: 'core.source-fetch',
  label: 'Fetch Source',
  input: {
    type: 'object',
    properties: {
      url: { type: 'string' },
      params: { type: 'object', optional: true },
      search: { type: 'object', optional: true },
      body: { type: 'object', optional: true }
    }
  },
  output: { type: 'object', properties: { schema: { type: 'object' }, data: { type: 'object' } } },
  isAsync: true,
  implementation: (
    args: { url: string; body?: Record<string, any>; search?: Record<string, any>; params?: Record<string, any> },
    abortController
  ) => {
    if (!abortController) abortController = new AbortController()

    if (args.params && args.body) args.params.body = JSON.stringify(args.body)

    const url = args.search ? `${args.url}?${new URLSearchParams(args.search).toString()}` : args.url
    console.log(url, args.params)
    return new Promise<{ schema: JSONSchema; data: any }>((resolve, reject) => {
      fetch(url, { signal: abortController.signal, ...args.params })
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
              if (abortController.signal.aborted) return
              console.error(error)
              reject(error)
            })
        })
        .catch((error) => {
          if (abortController.signal.aborted) return
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
  input: { type: 'object', properties: { mapping: { type: 'object' } } },
  output: { type: 'object', properties: { meetsRequirements: { type: 'boolean' } } },
  isAsync: false,
  implementation: (args: { mapping: any }) => {
    const { mapping } = args
    const requirements = allRequirementsMet(mapping)
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
  implementation: <T extends JSONMappingSchema>(args: { data: any; mapping: T }) => {
    const { mapping, data } = args
    const transformedData = transformData(data, mapping)
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

export const IterationTool = {
  id: 'core.iteration',
  label: 'Iteration',
  input: {
    type: 'object',
    properties: {
      mapping: { type: 'object' },
      iterableMaping: { type: 'string' },
      outputMapping: { type: 'string' },
      batchCount: { type: 'object', optional: true },
      data: { type: 'object' }
    }
  },
  output: { type: 'object', properties: { iterationResult: { type: 'object' } } },
  isAsync: true,
  implementation: async (args: {
    data: any
    mapping: string
    iterableMapping: string
    outputMapping: string
    batchCount?: number
    tool: {
      id: string
      args: any
    }
  }) => {
    const iterable = getNestedObject(args.data, args.mapping).result
    const batchedData = args.batchCount
      ? iterable.reduce((acc: any[], item: any, index: number) => {
          const batchIndex = Math.floor(index / args.batchCount!)
          if (!acc[batchIndex]) acc[batchIndex] = []
          acc[batchIndex].push(item)
          return acc
        }, [] as any[])
      : [iterable]
    const results = [] as any[]
    for (const batch of batchedData) {
      console.log({ batch })
      const responses = await Promise.all(
        batch.map(
          (item: any) =>
            new Promise<any>((resolve) => {
              console.log({ item })
              const mergedArgs = structuredClone(args.tool.args)
              setNestedObject(
                mergedArgs,
                args.outputMapping,
                getNestedObject(item, args.iterableMapping).result.toLowerCase()
              )
              console.log({ mergedArgs, item, outputMapping: args.outputMapping })
              // prettier-ignore
              getState(DataToolRegistry)[args.tool.id].implementation(mergedArgs)
                .then((result) => {
                  console.log({result})
                  resolve(result.data) // todo add mapping
                })
                .catch((e) => {
                  console.error(e)
                  resolve(undefined)
                })
            })
        )
      )
      results.push(...responses)
    }
    return { iterationResult: results.filter((val) => typeof val !== 'undefined') }
  }
}

/**
 * @deprecated redundant, just replace with fetch tool
 */
export const QueryTool = {
  id: 'core.query',
  label: 'Query',
  input: {
    type: 'object',
    properties: {
      data: {
        type: 'object',
        properties: {
          body: { type: 'object', optional: true },
          params: { type: 'object', optional: true },
          search: { type: 'object', optional: true }
        }
      },
      query: {
        type: 'object',
        properties: {
          endpointURL: { type: 'string', optional: true },
          args: { type: 'object', optional: true },
          params: { type: 'object', optional: true }
        }
      }
    }
  },
  output: { type: 'object' },
  isAsync: true,
  implementation: async (
    args: {
      query: {
        endpointURL: string
        body?: Record<string, any>
        params?: Record<string, string>
        search?: Record<string, string>
      }
    },
    abortController
  ) => {
    const fetchTool = getState(DataToolRegistry)[SourceFetchTool.id]

    const fetchArgs = {
      url: args.query.endpointURL,
      search: args.query.search,
      params: args.query.params,
      body: args.query.body
    } as {
      url: string
      search?: Record<string, string>
      params?: Record<string, string>
      body?: Record<string, any>
    }

    const { data } = await fetchTool.implementation(fetchArgs, abortController)
    console.log({ data })
    return { data }
  }
}

const PipelineTool = {
  id: 'core.pipeline',
  label: 'Pipeline',
  input: { type: 'object', properties: { pipeline: { type: 'string' }, args: { type: 'object' } } },
  output: { type: 'object' },
  isAsync: true,
  implementation: async (args: { pipeline: string; inputArgs: any }, abortController) => {
    // todo: use KHR_interactivity

    const config = {
      url: 'https://sum-app.net/projects/173738202501291587/download_data/kumu_json',
      mapping: {
        nodes: [
          {
            id: 'elements.Id',
            label: 'elements.Label',
            image: ''
          }
        ],
        edges: [
          {
            source: 'connections.From',
            target: 'connections.To',
            weight: 'connections.Weight'
          }
        ]
      }
    }
  }
}

const CoreTools: Tool[] = [
  SourceFetchTool,
  SchemaFlattenTool,
  MappingRequirementsTool,
  MappedTransformationTool,
  VisualizationTool,
  QueryTool,
  PipelineTool
]
