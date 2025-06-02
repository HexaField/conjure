import React, { useState } from 'react'
import type { JSONSchemaType } from '../json-schema/JSONSchema'
import { JsonDisplay } from './JsonDisplay'

interface DataSource {
  id: string
  label: string
  url: string
  data: object | null
  loading: boolean
  errorMessage: string | null
}

interface MultipleDataSourcesSectionProps {
  dataSources: DataSource[]
  combinedData: object | null
  inputSchema: JSONSchemaType<any> | null
  onAddSource: () => void
  onRemoveSource: (id: string) => void
  onUpdateSource: (id: string, updates: Partial<DataSource>) => void
  onFetchData: (sourceId: string) => void
  onCombinedDataChange: (newData: object) => void
  onInputSchemaChange: (newSchema: JSONSchemaType<any>) => void
}

function copyCurrentUrlToClipboard(onSuccess: () => void) {
  navigator.clipboard
    .writeText(window.location.href)
    .then(() => {
      onSuccess()
    })
    .catch((err) => {
      console.error('Failed to copy URL: ', err)
    })
}

export function MultipleDataSourcesSection({
  dataSources,
  combinedData,
  inputSchema,
  onAddSource,
  onRemoveSource,
  onUpdateSource,
  onFetchData,
  onCombinedDataChange,
  onInputSchemaChange
}: MultipleDataSourcesSectionProps) {
  const [showCopiedMessage, setShowCopiedMessage] = useState(false)

  const handleCopyUrl = () => {
    copyCurrentUrlToClipboard(() => {
      setShowCopiedMessage(true)
      setTimeout(() => setShowCopiedMessage(false), 2000)
    })
  }

  return (
    <div className="space-y-6 rounded-xl bg-white p-6 shadow-lg">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-800">Data Sources</h2>
        <div className="flex items-center gap-2">
          {showCopiedMessage && <span className="text-sm font-medium text-green-600">URL copied!</span>}
          <button
            onClick={handleCopyUrl}
            className="rounded-lg bg-gray-600 px-3 py-2 text-sm text-white transition-colors hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            title="Copy shareable URL with current sources"
          >
            📋 Share
          </button>
          <button
            onClick={onAddSource}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-white transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Add Source
          </button>
        </div>
      </div>

      {dataSources.length === 0 && (
        <div className="py-8 text-center text-gray-500">
          <p>No data sources added yet. Click "Add Source" to get started.</p>
        </div>
      )}

      {dataSources.map((source) => (
        <div key={source.id} className="space-y-4 rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-gray-700">Label (object key)</label>
              <input
                type="text"
                value={source.label}
                onChange={(e) => onUpdateSource(source.id, { label: e.target.value })}
                placeholder="e.g., users, posts, comments"
                className="w-full rounded-md border border-gray-300 px-3 py-2 outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">JSON URL</label>
              <input
                type="url"
                value={source.url}
                onChange={(e) => onUpdateSource(source.id, { url: e.target.value })}
                placeholder="https://jsonplaceholder.typicode.com/posts"
                className="w-full rounded-md border border-gray-300 px-3 py-2 outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                disabled={source.loading}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onFetchData(source.id)}
                disabled={source.loading || !source.url.trim() || !source.label.trim()}
                className="rounded-md bg-green-600 px-4 py-2 text-white transition-colors hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-400"
              >
                {source.loading ? 'Loading...' : 'Fetch'}
              </button>
              <button
                onClick={() => onRemoveSource(source.id)}
                className="rounded-md bg-red-600 px-3 py-2 text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                ×
              </button>
            </div>
          </div>

          {/* Error Display */}
          {source.errorMessage && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-4 w-4 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-2">
                  <p className="text-sm text-red-700">{source.errorMessage}</p>
                </div>
              </div>
            </div>
          )}

          {/* Success indicator */}
          {source.data && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-3">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-4 w-4 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-2">
                  <p className="text-sm text-green-700">Data loaded successfully</p>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Combined Data Display */}
      {combinedData && (
        <div className="border-t pt-6">
          <JsonDisplay
            title="Combined Data"
            data={combinedData}
            copyButtonText="Copy Combined Data"
            editable={true}
            onDataChange={onCombinedDataChange}
          />
        </div>
      )}

      {/* JSON Schema Display */}
      {inputSchema && (
        <JsonDisplay
          title="Combined JSON Schema"
          data={inputSchema}
          copyButtonText="Copy Schema"
          editable={true}
          onDataChange={onInputSchemaChange}
        />
      )}
    </div>
  )
}
