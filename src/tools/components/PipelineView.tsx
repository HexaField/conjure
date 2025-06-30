import { useHookstate } from '@hookstate/core'
import { getMutableState, getState, NO_PROXY } from '@ir-engine/hyperflux'
import React, { useEffect } from 'react'
import { TargetVisualizationState } from '../graph/DataState'
import { contentHash } from '../json-schema/contentHash'
import { generateJsonSchema } from '../json-schema/generateJsonSchema'
import { JSONSchemaType } from '../json-schema/JSONSchema'
import { Tool, ToolRegistry } from '../ToolRegistry'
import { ToolCard } from './ToolCard'

// Type for input state
interface InputSource {
  url: string
  data: unknown | null
  loading: boolean
  errorMessage: string | null
  schema: JSONSchemaType<any> | null
  hash: string | null
}

export const PipelineView: React.FC = () => {
  const tools = useHookstate(getMutableState(ToolRegistry).tools)
  // State for multiple input sources
  const inputs = useHookstate<InputSource[]>([
    { url: '', data: null, loading: false, errorMessage: null, schema: null, hash: null }
  ])
  // Output schema selection
  const visualizationType = useHookstate('hexafield.conjure.graph-tool.ForceGraph') // todo put in search params once we have multiple
  const targetGraph = getState(TargetVisualizationState)[visualizationType.get()]
  const targetSchema = targetGraph?.value

  // On mount, initialize from search params if present
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    // Collect urlN params in order
    const urlParams: string[] = []
    let i = 0
    while (true) {
      const url = params.get(`url${i}`)
      if (!url) break
      urlParams.push(url)
      i++
    }
    const graphTypeParam = params.get('graphType')
    if (urlParams.length > 0) {
      // Set input URLs from params
      const arr = urlParams.map((url) => ({
        url,
        data: null,
        loading: false,
        errorMessage: null,
        schema: null,
        hash: null
      }))
      inputs.set(arr)
      // Fetch each input URL
      for (let i = 0; i < arr.length; i++) fetchInput(i)
    }
    if (graphTypeParam) {
      // Set output schema index from params
      const schemaIndex = getState(TargetVisualizationState)[graphTypeParam]
      if (schemaIndex) {
        visualizationType.set(graphTypeParam)
      }
    }
  }, [])

  // Persist each input URL and output graph type to search params individually (not as a list)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    // Remove all urlN params first
    Array.from(params.keys())
      .filter((k) => /^url\d+$/.test(k))
      .forEach((k) => params.delete(k))
    // Set each url as url0, url1, ...
    inputs.forEach((input, idx) => {
      const url = input.url.get()
      if (url) params.set(`url${idx}`, url)
    })
    // Set graphType param
    params.set('graphType', visualizationType.get())
    window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`)
  }, [inputs.map((input) => input.url.get()).join(','), visualizationType.get()])

  // Fetch and process a single input
  const fetchInput = async (idx: number) => {
    inputs[idx].merge({ loading: true, errorMessage: null })
    const url = inputs[idx].url.get().trim()
    if (!url) {
      inputs[idx].merge({ loading: false, errorMessage: 'URL required' })
      return
    }
    try {
      const resp = await fetch(url)
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      const data = await resp.json()
      const schema = generateJsonSchema(data)
      const hash = contentHash(schema)
      inputs[idx].merge({ data, schema, hash, loading: false, errorMessage: null })
    } catch (e: any) {
      inputs[idx].merge({ loading: false, errorMessage: e.message || 'Fetch failed' })
    }
  }

  // Add/remove input sources
  const addInput = () =>
    inputs.merge([{ url: '', data: null, loading: false, errorMessage: null, schema: null, hash: null }])
  const removeInput = (idx: number) => {
    if (inputs.length > 1) {
      const arr = inputs.get({ noproxy: true }).slice()
      arr.splice(idx, 1)
      inputs.set(arr)
    }
  }

  // Output schema and hash
  const outputHash = targetSchema ? contentHash(targetSchema) : null

  // Find matching tools
  const inputHashes = inputs
    .get({ noproxy: true })
    .map((input) => input.hash)
    .filter((h): h is string => !!h)
  const matchingTools = Object.values(tools.value as Record<string, any>).filter(
    (tool) => inputHashes.includes(tool.inputHash) && outputHash && tool.outputHash === outputHash
  ) as Tool[]

  // New: Check if all inputs have a matching tool
  const allInputsHaveTool =
    inputs.every((input) => input.hash.get() && matchingTools.some((tool) => tool.inputHash === input.hash.get())) &&
    matchingTools.length > 0 &&
    outputHash

  // New: Run transformation tool and create graph
  const runToolAndCreateGraph = async () => {
    // For each input, find the matching tool and run it
    const results = await Promise.all(
      inputs.get(NO_PROXY).map((input) => {
        if (!input.hash || !input.data) return null // Skip if no hash or data
        const tool = matchingTools.find((t) => t.inputHash === input.hash && t.outputHash === outputHash)
        if (!tool) {
          console.error(`No matching tool found for input hash ${input.hash}`)
          return null
        }
        try {
          return ToolRegistry.run(tool.hash, input.data)
        } catch (e) {
          // Optionally handle error
          console.error('Tool run failed', e)
        }
      })
    )
    // Now, create the graph using the output schema's onConfirm/onData logic
    // (see MappingUI.tsx for reference)
    if (targetGraph && typeof targetGraph.onData === 'function') {
      // Compose data as MappingUI does: { [url]: transformedData }
      const dataObj: Record<string, any> = {}
      inputs.forEach((input, i) => {
        const url = input.url.get()
        dataObj[url] = results[i]
      })
      try {
        const finalData = targetGraph.onData(dataObj)
        if (typeof targetGraph.onConfirm === 'function') {
          targetGraph.onConfirm(finalData)
        }
      } catch (e) {
        console.error('Graph creation failed', e)
      }
    }
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow-md">
      <h2 className="mb-4 text-xl font-semibold">Graph Tool Runner</h2>
      <div className="mb-6">
        <h3 className="mb-2 font-medium">Input Sources</h3>
        {inputs.map((input, idx) => (
          <div key={idx} className="mb-2 flex items-center space-x-2">
            <input
              id="url"
              type="text"
              className="w-72 rounded border px-2 py-1 text-sm"
              placeholder="Enter data URL..."
              value={input.url.get()}
              onChange={(e) => input.url.set(e.target.value)}
              disabled={input.loading.get()}
            />
            <button
              className="rounded bg-indigo-600 px-3 py-1 text-xs text-white hover:bg-indigo-700 disabled:bg-gray-300"
              onClick={() => fetchInput(idx)}
              disabled={input.loading.get() || !input.url.get().trim()}
            >
              {input.loading.get() ? 'Loading...' : 'Fetch'}
            </button>
            <button
              className="rounded bg-gray-200 px-2 py-1 text-xs text-gray-700 hover:bg-gray-300"
              onClick={() => removeInput(idx)}
              disabled={inputs.length === 1}
            >
              Remove
            </button>
            {input.errorMessage.get() && <span className="ml-2 text-xs text-red-500">{input.errorMessage.get()}</span>}
            {input.hash.get() && typeof input.hash.get() === 'string' && (
              <span className="ml-2 text-xs text-green-600">Schema hash: {input.hash.get()!.slice(0, 8)}...</span>
            )}
          </div>
        ))}
        <button
          className="mt-2 rounded bg-blue-100 px-3 py-1 text-xs text-blue-700 hover:bg-blue-200"
          onClick={addInput}
        >
          + Add Source
        </button>
      </div>
      <div className="mb-6">
        <h3 className="mb-2 font-medium">Output Graph Type</h3>
        <select
          className="w-72 rounded border px-2 py-1 text-sm"
          value={targetGraph?.id || ''}
          onChange={(e) => visualizationType.set(e.target.value)}
          disabled={!targetGraph}
        >
          {Object.values(getState(TargetVisualizationState)).map((schema) => (
            <option key={schema.id} value={schema.id}>
              {schema.label || schema.id}
            </option>
          ))}
        </select>
        {outputHash && typeof outputHash === 'string' && (
          <span className="ml-2 text-xs text-green-600">Output hash: {outputHash.slice(0, 8)}...</span>
        )}
      </div>
      <div>
        <h3 className="mb-2 font-medium">Matching Tools</h3>
        {matchingTools.length === 0 ? (
          <div className="text-sm text-gray-500">No matching tools found for the selected schemas.</div>
        ) : (
          <ul className="space-y-2">
            {matchingTools.map((tool) => (
              <ToolCard key={tool.hash} tool={tool} />
            ))}
          </ul>
        )}
        {/* New: Run Tool button */}
        <button
          className="mt-4 rounded bg-green-600 px-4 py-2 font-semibold text-white disabled:bg-gray-300"
          onClick={runToolAndCreateGraph}
          disabled={!allInputsHaveTool}
        >
          Run Tool & Create Graph
        </button>
      </div>
    </div>
  )
}
