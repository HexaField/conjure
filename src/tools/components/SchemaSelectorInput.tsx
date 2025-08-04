import { getMutableState, NO_PROXY, useHookstate } from '@ir-engine/hyperflux'
import React, { useState } from 'react'
import { SchemaRegistry } from '../registries/SchemaRegistry'
import { JsonDisplay } from './JsonDisplay'

interface KnownSchema {
  id: string
  schema: any
}

interface SchemaSelectorInputProps {
  label: string
  selectorState: any
  onUrlChange: (url: string) => void
  onKnownSchemaSelect: (schemaId: string) => void
  inputSchema?: any
  jsonData?: any
}

const SchemaSelectorInput: React.FC<SchemaSelectorInputProps> = ({
  label,
  selectorState,
  onUrlChange,
  onKnownSchemaSelect,
  inputSchema,
  jsonData
}) => {
  // Determine initial mode from selectorState
  const initialMode = selectorState.kind === 'known' ? 'known' : 'url'
  const [mode, setMode] = useState<'url' | 'known'>(initialMode)

  // When mode changes, clear the other field
  const handleModeChange = (newMode: 'url' | 'known') => {
    setMode(newMode)
    if (newMode === 'url') {
      onKnownSchemaSelect('')
    } else {
      onUrlChange('')
    }
  }

  const knownSchemas = useHookstate(getMutableState(SchemaRegistry).schemas).get(NO_PROXY)

  return (
    <div className="mt-4 space-y-4 rounded-xl bg-white p-6 shadow-lg">
      <label className="font-medium">{label}</label>
      <div className="mb-2 flex items-center gap-4">
        <span className="text-sm">URL</span>
        <label className="relative inline-flex cursor-pointer items-center">
          <input
            type="checkbox"
            className="peer sr-only"
            checked={mode === 'known'}
            onChange={() => handleModeChange(mode === 'url' ? 'known' : 'url')}
          />
          <div className="peer h-6 w-11 rounded-full bg-gray-200 transition-all peer-checked:bg-blue-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 dark:bg-gray-700"></div>
        </label>
        <span className="text-sm">Known</span>
      </div>
      <div className="flex gap-2">
        {mode === 'url' && (
          <input
            name="url"
            className="rounded border px-2 py-1"
            type="text"
            placeholder="Fetch schema from URL"
            value={selectorState.kind === 'url' ? selectorState.url : ''}
            onChange={(e) => onUrlChange(e.target.value)}
          />
        )}
        {mode === 'known' && (
          <select
            className="rounded border px-2 py-1"
            value={selectorState.kind === 'known' ? selectorState.schemaId : ''}
            onChange={(e) => onKnownSchemaSelect(e.target.value)}
          >
            <option value="">Select known schema</option>
            {Object.values(knownSchemas).map(({ hash, label }) => (
              <option key={hash} value={hash}>
                {label}
              </option>
            ))}
          </select>
        )}
        {/* Custom schema editor could be added here */}
      </div>
      {mode === 'url' && selectorState.kind === 'url' && selectorState.loading && <span>Loading...</span>}
      {mode === 'url' && selectorState.kind === 'url' && selectorState.errorMessage && (
        <span className="text-red-500">{selectorState.errorMessage}</span>
      )}

      {/* JSON Schema Display */}
      {inputSchema && <JsonDisplay title="JSON Schema" data={inputSchema} copyButtonText="Copy Schema" />}

      {/* JSON Display */}
      {jsonData && <JsonDisplay title="JSON Data" data={jsonData} copyButtonText="Copy JSON" />}
    </div>
  )
}

export default SchemaSelectorInput
