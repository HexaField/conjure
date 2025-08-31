import { getMutableState, getState, hookstate, NO_PROXY, useHookstate, useMutableState } from '@ir-engine/hyperflux'
import React, { useEffect } from 'react'
import PipelineCard from '../components/PipelineCard'
import Tabs from '../components/Tabs'
import { ToolCard } from '../components/ToolCard'
import { contentHash } from '../json-schema/contentHash'
import { generateJsonSchema } from '../json-schema/generateJsonSchema'
import { JSONSchemaType } from '../json-schema/JSONSchema'
import { PipelineGraph } from '../new/components/PipelineEditor'
import { runPipeline } from '../new/logic/runPipeline'
import { PipelineRegistry } from '../registries/PipelineRegistry'
import { TargetRegistry } from '../registries/TargetRegistry'
import { Tool, ToolRegistry } from '../registries/ToolRegistry'

const tabs = [
  { label: 'Create', value: 'create' },
  { label: 'Library', value: 'library' }
]

// Type for input state
interface InputSource {
  url: string
  data: unknown | null
  loading: boolean
  errorMessage: string | null
  schema: JSONSchemaType<any> | null
  hash: string | null
}

// Type for shared configuration
interface SharedConfig {
  inputs: Array<{ url: string }>
  graphType: string
  autoRun?: boolean
  tools: Record<string, Tool>
  targetSchemas: Record<string, any>
}

// Props for ShareLinkComponent
interface ShareLinkProps {
  inputs: readonly InputSource[]
  graphType: string
  isVisible: boolean
  createShareConfig: () => SharedConfig
  selectedTool?: Tool | null
  outputHash?: string | null
}

// Share Link Component
function ShareLinkComponent({
  inputs,
  graphType,
  isVisible,
  createShareConfig,
  selectedTool,
  outputHash
}: ShareLinkProps): JSX.Element | null {
  const shareMessage = useHookstate<string | null>(null)

  // Generate share file and download it
  const createShareFile = async () => {
    try {
      const config = createShareConfig()
      const jsonString = JSON.stringify(config, null, 2)
      const blob = new Blob([jsonString], { type: 'application/json' })

      // Create download link
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `conjure-config-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      shareMessage.set('Configuration file downloaded!')
      setTimeout(() => shareMessage.set(null), 3000)
    } catch (e) {
      console.error('Failed to create share file:', e)
      shareMessage.set('Failed to create configuration file')
      setTimeout(() => shareMessage.set(null), 5000)
    }
  }

  if (!isVisible) return null

  return (
    <div className="mb-6">
      <h3 className="mb-2 font-medium">Share Configuration</h3>
      <button
        className="rounded bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700"
        onClick={createShareFile}
      >
        � Download Config File
      </button>
      <button
        className="ml-2 rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:bg-gray-300"
        disabled={!selectedTool}
        onClick={() => {
          if (!selectedTool) return
          // Build a minimal pipeline graph: input -> transform -> viz
          const inputUrl = inputs[0]?.url || ''
          const n1 = {
            id: `n_${crypto.randomUUID()}`,
            type: 'db',
            data: { type: 'input.url', config: { url: inputUrl, schemaHash: inputs[0]?.hash || null } },
            position: { x: 100, y: 120 }
          }
          const n2 = {
            id: `n_${crypto.randomUUID()}`,
            type: 'db',
            data: { type: 'xform.js', config: { toolHash: selectedTool.hash } },
            position: { x: 360, y: 120 }
          }
          const n3 = {
            id: `n_${crypto.randomUUID()}`,
            type: 'db',
            data: { type: 'viz.table', config: { outputHash: outputHash || null } },
            position: { x: 620, y: 120 }
          }
          const e1 = { id: `e_${crypto.randomUUID()}`, source: n1.id, target: n2.id }
          const e2 = { id: `e_${crypto.randomUUID()}`, source: n2.id, target: n3.id }
          const label = `${selectedTool.label || 'Pipeline'} (${new URL(inputUrl || 'http://example.com').hostname})`
          const description = `Auto-saved pipeline from Share panel. Tool: ${
            selectedTool.label
          } (${selectedTool.hash.slice(0, 8)}), Output: ${graphType}`
          const hash = PipelineRegistry.register({
            label,
            description,
            graph: {
              nodes: [n1, n2, n3],
              edges: [e1 as any, e2 as any],
              meta: { graphType, outputHash: outputHash || null }
            }
          })
          shareMessage.set(`Pipeline saved (${hash.slice(0, 8)}…)`)
          setTimeout(() => shareMessage.set(null), 3000)
        }}
      >
        Save Pipeline
      </button>
      {shareMessage.get() && (
        <div className="mt-2 rounded border border-green-400 bg-green-100 px-4 py-2 text-sm text-green-700">
          {shareMessage.get()}
        </div>
      )}
      <p className="mt-2 text-xs text-gray-600">
        Downloads a configuration file that includes your input sources and selected graph type. Recipients can upload
        this file to automatically load and run the tools.
      </p>
    </div>
  )
}

function PipelineUseView(): JSX.Element {
  const tools = useHookstate(getMutableState(ToolRegistry).tools)
  const selectedTool = useHookstate<Tool | null>(null)
  // State for multiple input sources
  const inputs = useHookstate<InputSource[]>([
    { url: '', data: null, loading: false, errorMessage: null, schema: null, hash: null }
  ])
  // Output schema selection
  const defaultGraphType = Object.keys(getState(TargetRegistry))[0] || ''
  const visualizationType = useHookstate(defaultGraphType) // todo put in search params once we have multiple
  const targetRegistry = useMutableState(TargetRegistry).get(NO_PROXY)
  const targetGraph = targetRegistry[visualizationType.value]
  const targetSchema = targetGraph?.value

  // Load shared configuration from file
  const loadShareConfig = (config: SharedConfig) => {
    try {
      // Restore tools from the shared config
      if (config.tools) {
        const currentTools = getMutableState(ToolRegistry).tools
        Object.entries(config.tools).forEach(([hash, tool]) => {
          currentTools.merge({ [hash]: tool })
        })
      }

      // Restore target schemas from the shared config
      if (config.targetSchemas) {
        const currentTargetRegistry = getMutableState(TargetRegistry)
        Object.entries(config.targetSchemas).forEach(([key, schema]) => {
          currentTargetRegistry.merge({ [key]: schema })
        })
      }

      // Set inputs from shared config
      const arr = config.inputs.map((input) => ({
        url: input.url,
        data: null,
        loading: false,
        errorMessage: null,
        schema: null,
        hash: null
      }))
      inputs.set(arr)

      // Set graph type from shared config
      if (config.graphType && getState(TargetRegistry)[config.graphType]) {
        visualizationType.set(config.graphType)
      }

      // Fetch each input URL and auto-run if specified
      const fetchAndRun = async () => {
        // Fetch all inputs
        const fetchPromises = arr.map((_, i) => fetchInput(i))
        await Promise.all(fetchPromises)

        // Auto-run if specified
        if (config.autoRun) {
          // Wait a bit for state to update
          setTimeout(() => {
            const currentInputs = inputs.get(NO_PROXY)
            const allInputsReady = currentInputs.every((input) => input.hash && input.data)
            if (allInputsReady) {
              runToolAndCreateGraph()
            }
          }, 1000)
        }
      }

      fetchAndRun()
    } catch (e) {
      console.error('Failed to load shared configuration:', e)
    }
  }

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const config = JSON.parse(e.target?.result as string) as SharedConfig
        loadShareConfig(config)
      } catch (error) {
        console.error('Failed to parse configuration file:', error)
        // You might want to show an error message to the user here
      }
    }
    reader.readAsText(file)

    // Clear the input so the same file can be selected again
    event.target.value = ''
  }

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

  // On mount, initialize from search params if present (legacy URL params only)
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
      const schemaIndex = getState(TargetRegistry)[graphTypeParam]
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
  const matchingTools = Object.values(tools.get(NO_PROXY) as Record<string, any>).filter(
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
    // Now, create the graph using the output schema's deserialize logic
    if (targetGraph) {
      const dataObj: Record<string, any> = {}
      inputs.forEach((input, i) => {
        const url = input.url.get()
        dataObj[url] = results[i]
      })
      try {
        targetGraph.deserialize(dataObj)
      } catch (e) {
        console.error('Graph creation failed', e)
      }
    }
  }

  // Create optimized share configuration with only necessary tools and schemas
  const createShareConfig = (): SharedConfig => {
    // Only include tools that are needed for the current inputs and output
    const necessaryTools: Record<string, Tool> = {}
    matchingTools.forEach((tool) => {
      necessaryTools[tool.hash] = tool
    })

    // Only include the target schema for the selected graph type
    const necessaryTargetSchemas: Record<string, any> = {}
    if (targetGraph) {
      necessaryTargetSchemas[visualizationType.get()] = targetGraph
    }

    const config: SharedConfig = {
      inputs: inputs.get(NO_PROXY).map((input) => ({ url: input.url })),
      graphType: visualizationType.get(),
      autoRun: true,
      tools: necessaryTools,
      targetSchemas: necessaryTargetSchemas
    }
    return config
  }

  return (
    <>
      <div className="mb-6">
        <h3 className="mb-2 font-medium">Load Configuration</h3>
        <div className="flex items-center space-x-2">
          <input
            type="file"
            accept=".json"
            onChange={handleFileUpload}
            className="text-sm file:mr-2 file:rounded file:border-0 file:bg-blue-600 file:px-3 file:py-1 file:text-white file:hover:bg-blue-700"
          />
          <span className="text-xs text-gray-600">Upload a configuration file to restore a shared setup</span>
        </div>
      </div>
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
          value={targetGraph?.hash || ''}
          onChange={(e) => visualizationType.set(e.target.value)}
          disabled={!targetGraph}
        >
          {Object.values(targetRegistry).map((schema) => (
            <option key={schema.hash} value={schema.hash}>
              {schema.label || schema.hash}
            </option>
          ))}
        </select>
        {outputHash && typeof outputHash === 'string' && (
          <span className="ml-2 text-xs text-green-600">Output hash: {outputHash.slice(0, 8)}...</span>
        )}
      </div>
      <div className="mb-6">
        <h3 className="mb-2 font-medium">Matching Tools</h3>
        {matchingTools.length === 0 ? (
          <div className="text-sm text-gray-500">No matching tools found for the selected schemas.</div>
        ) : (
          <ul className="space-y-2">
            {matchingTools.map((tool) => (
              <ToolCard
                key={tool.hash}
                tool={tool}
                onUse={() => {
                  selectedTool.set(tool)
                  runToolAndCreateGraph()
                }}
              />
            ))}
          </ul>
        )}
      </div>
      <ShareLinkComponent
        inputs={inputs.get(NO_PROXY) as InputSource[]}
        graphType={visualizationType.get()}
        isVisible={!!allInputsHaveTool}
        createShareConfig={createShareConfig}
        selectedTool={selectedTool.get(NO_PROXY)!}
        outputHash={outputHash}
      />
    </>
  )
}

function PipelineLibraryView(): JSX.Element {
  const tools = useHookstate(getMutableState(ToolRegistry).tools)
  const toolList = Object.values(tools.value) as Tool[]
  const editorTools = toolList.map((t) => ({ hash: t.hash, label: t.label }))
  const pipelines = useMutableState(PipelineRegistry).pipelines.value
  const pipelineList = Object.values(pipelines)

  const saveGraphForPipeline = (graph: PipelineGraph, pipeline: any) => {
    // Register a new version for now; could update in place if desired
    const newHash = PipelineRegistry.register({
      label: pipeline.label,
      description: pipeline.description,
      graph: { nodes: graph.nodes, edges: graph.edges }
    })
    console.log('pipeline saved:', newHash)
  }

  return (
    <div className="mb-6">
      <h3 className="mb-2 font-medium">Pipelines</h3>
      {pipelineList.length === 0 ? (
        <div className="text-sm text-gray-500">No pipelines saved.</div>
      ) : (
        <ul className="space-y-3">
          {pipelineList.map((p) => {
            const mutable = {
              ...p,
              graph: {
                nodes: [...(p.graph?.nodes || [])],
                edges: [...(p.graph?.edges || [])],
                meta: p.graph?.meta ? { ...p.graph.meta } : undefined
              }
            }
            return (
              <li key={p.hash}>
                <PipelineCard
                  pipeline={mutable as any}
                  tools={editorTools}
                  onRun={async () => {
                    // Optionally run the graph here if needed per card
                    await runPipeline(mutable.graph)
                  }}
                  onSaveGraph={saveGraphForPipeline}
                />
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

const tabState = hookstate<string>('create' as 'create' | 'library')

export const PipelineView: React.FC = () => {
  const tab = useHookstate(tabState)
  return (
    <div className="rounded-lg bg-white p-6 shadow-md">
      <h2 className="mb-4 text-xl font-semibold">Graph Tool Runner</h2>
      <Tabs tabs={tabs} onChange={tab.set} value={tab.value} />
      <div className="mt-4">{tab.value === 'create' ? <PipelineUseView /> : <PipelineLibraryView />}</div>
    </div>
  )
}
