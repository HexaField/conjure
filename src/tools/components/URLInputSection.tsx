import React from 'react'
import type { JSONSchemaType } from '../json-schema/JSONSchema'
import { JsonDisplay } from './JsonDisplay'

interface UrlInputSectionProps {
  url: string
  loading: boolean
  errorMessage: string | null
  jsonData: object | null
  inputSchema: JSONSchemaType<unknown> | null
  onUrlChange: (url: string) => void
  onSubmit: (e: React.FormEvent) => void
}

export function UrlInputSection({
  url,
  loading,
  errorMessage,
  jsonData,
  inputSchema,
  onUrlChange,
  onSubmit
}: UrlInputSectionProps) {
  return (
    <div className="space-y-4 rounded-xl bg-white p-6 shadow-lg">
      <div>
        <label htmlFor="url" className="mb-2 block text-sm font-medium text-gray-700">
          JSON URL
        </label>
        <input
          type="url"
          id="url"
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
          placeholder="https://jsonplaceholder.typicode.com/posts/1"
          className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
          disabled={loading}
        />
      </div>
      <button
        type="submit"
        onClick={onSubmit}
        disabled={loading || !url.trim()}
        className="w-full rounded-lg bg-indigo-600 px-6 py-3 text-white transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-400"
      >
        {loading ? 'Loading...' : 'Fetch JSON'}
      </button>

      {/* Error Display */}
      {errorMessage && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="mt-1 text-sm text-red-700">{errorMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* JSON Schema Display */}
      {inputSchema && <JsonDisplay title="JSON Schema" data={inputSchema} copyButtonText="Copy Schema" />}

      {/* JSON Display */}
      {jsonData && <JsonDisplay title="JSON Data" data={jsonData} copyButtonText="Copy JSON" />}
    </div>
  )
}
