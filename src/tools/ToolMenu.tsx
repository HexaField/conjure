import { getMutableState, useHookstate } from '@ir-engine/hyperflux'
import { Button } from '@ir-engine/ui'
import React from 'react'
import { HiChevronLeft, HiChevronRight } from 'react-icons/hi'
import EditTool from './EditTool'
import { TargetSchemas } from './TargetRegistry'
import { ToolRegistry } from './ToolRegistry'
import { contentHash } from './json-schema/contentHash'
import { generateJsonSchema } from './json-schema/generateJsonSchema'

// Type for input state
interface InputSource {
  url: string
  data: any
  loading: boolean
  errorMessage: string | null
  schema: any | null
  hash: string | null
}

const UseToolsMenu: React.FC = () => {
  const tools = useHookstate(getMutableState(ToolRegistry).tools)
  // State for multiple input sources
  const inputs = useHookstate<InputSource[]>([
    { url: '', data: null, loading: false, errorMessage: null, schema: null, hash: null }
  ])
  // Output schema selection
  const outputSchemaIdx = useHookstate(0)

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
  const outputSchema = TargetSchemas[outputSchemaIdx.get()]
  const outputHash = outputSchema ? contentHash(outputSchema) : null

  // Find matching tools
  const inputHashes = inputs
    .get({ noproxy: true })
    .map((input) => input.hash)
    .filter((h): h is string => !!h)
  const matchingTools = Object.values(tools.value as Record<string, any>).filter(
    (tool) => inputHashes.includes(tool.inputHash) && outputHash && tool.outputHash === outputHash
  )

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
          value={outputSchemaIdx.get()}
          onChange={(e) => outputSchemaIdx.set(Number(e.target.value))}
        >
          {TargetSchemas.map((schema, i) => (
            <option key={i} value={i}>
              {schema.label || `Graph ${i + 1}`}
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
              <li key={tool.hash} className="flex flex-col rounded border bg-gray-50 p-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-800">{tool.label}</span>
                  <span className="text-xs text-gray-500">{tool.hash.slice(0, 8)}...</span>
                </div>
                <div className="text-xs text-gray-600">{tool.description}</div>
                <div className="mt-1 text-xs text-gray-400">
                  Input hash: {tool.inputHash.slice(0, 8)}... | Output hash: {tool.outputHash.slice(0, 8)}...
                </div>
                {/* You can add an Activate/Run button here if needed */}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

const tabs = [
  { name: 'Graph', value: 'graph' },
  { name: 'Edit', value: 'edit' }
] as const

function ToolMenus(): JSX.Element {
  const tab = useHookstate('graph' as 'graph' | 'edit')
  const setTab = (value: 'graph' | 'edit') => {
    tab.set(value)
  }

  return (
    <div className="pointer-events-auto min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="mb-4 flex items-center justify-center space-x-4">
        {tabs.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab.value === t.value ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            {t.name}
          </button>
        ))}
      </div>
      <div className="mx-auto max-w-4xl space-y-6">{tab.value === 'graph' ? <UseToolsMenu /> : <EditTool />}</div>
    </div>
  )
}

function ToolUI() {
  const showMappingUI = useHookstate(true)
  return (
    <div className="pointer-events-auto z-[10] h-fit w-fit overflow-auto overflow-x-auto overflow-y-auto rounded-lg bg-white p-4">
      <div className="flex flex-row p-4">
        <Button
          className="p-4"
          variant="tertiary"
          style={{ top: '10px', left: showMappingUI.value ? '310px' : '10px' }}
          onClick={() => showMappingUI.set(!showMappingUI.value)}
        >
          {showMappingUI.value ? (
            <HiChevronLeft className="text-theme-primary pointer-events-none place-self-center" />
          ) : (
            <HiChevronRight className="text-theme-primary pointer-events-none place-self-center" />
          )}
        </Button>
        <div
          className="h-full overflow-auto overflow-y-auto p-4"
          style={{ display: showMappingUI.value ? 'block' : 'none' }}
        >
          <h2 className="mb-4 text-2xl font-semibold">Tool Menu</h2>
          <ToolMenus />
        </div>
      </div>
    </div>
  )
}

export default ToolUI
