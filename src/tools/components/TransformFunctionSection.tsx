import React from 'react'
import type { JSONSchemaType } from '../json-schema/JSONSchema'
import { CODING_MODELS } from '../llm/useLLM'
import { JsonDisplay } from './JsonDisplay'

interface TransformFunctionSectionProps {
  selectedTargetSchema: JSONSchemaType<any> | null
  inputSchema: JSONSchemaType<any> | null
  transformFunction: string | null
  transformFunctionHash: string | null
  additionalPrompt: string
  selectedModel: string
  onCreateFunction: () => void
  onAdditionalPromptChange: (prompt: string) => void
  onTransformFunctionChange: (newFunction: string) => void
  onModelChange: (modelId: string) => void
  llmLoadProgress: number
  llmInitializing: boolean
}

export function TransformFunctionSection({
  selectedTargetSchema,
  inputSchema,
  transformFunction,
  transformFunctionHash,
  additionalPrompt,
  selectedModel,
  onCreateFunction,
  onAdditionalPromptChange,
  onTransformFunctionChange,
  onModelChange,
  llmLoadProgress,
  llmInitializing
}: TransformFunctionSectionProps) {
  const selectedModelInfo = CODING_MODELS.find((m) => m.id === selectedModel)

  return (
    <div className="rounded-xl bg-white p-6 shadow-lg">
      <div className="mb-4 flex items-center justify-between">
        <label htmlFor="targetSchema" className="mb-2 block text-sm font-medium text-gray-700">
          Create Transform Function
        </label>
        {(llmLoadProgress < 1 || llmInitializing) && (
          <div className="text-sm text-gray-500">
            {llmInitializing ? 'Switching model...' : `Loading LLM: ${Math.round(llmLoadProgress * 100)}%`}
          </div>
        )}
      </div>

      {/* Model Selection */}
      <div className="mb-4">
        <label htmlFor="modelSelect" className="mb-2 block text-sm font-medium text-gray-700">
          Select Coding Model
        </label>
        <select
          id="modelSelect"
          value={selectedModel}
          onChange={(e) => onModelChange(e.target.value)}
          disabled={llmInitializing}
          className="w-full rounded-md border border-gray-300 px-3 py-2 outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-100"
        >
          {CODING_MODELS.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name} ({model.parameters}) - {model.description}
            </option>
          ))}
        </select>
        {selectedModelInfo && (
          <p className="mt-1 text-xs text-gray-500">
            Size: {selectedModelInfo.size} | Parameters: {selectedModelInfo.parameters}
          </p>
        )}
      </div>

      {/* Additional Prompt Input */}
      <div className="mb-4">
        <label htmlFor="additionalPrompt" className="mb-2 block text-sm font-medium text-gray-700">
          Additional Instructions (Optional)
        </label>
        <textarea
          id="additionalPrompt"
          value={additionalPrompt}
          onChange={(e) => onAdditionalPromptChange(e.target.value)}
          placeholder="Add any specific requirements, constraints, or instructions for the transformation function..."
          className="resize-vertical w-full rounded-md border border-gray-300 px-3 py-2 outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
          rows={3}
        />
        <p className="mt-1 text-xs text-gray-500">
          This will be included in the prompt to help the AI generate a more specific transformation function.
        </p>
      </div>

      {/* Button */}
      <div className="mt-4">
        <button
          className="w-full rounded-lg bg-indigo-600 px-6 py-3 text-white transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-400"
          disabled={!selectedTargetSchema || !inputSchema || llmInitializing || llmLoadProgress < 1}
          onClick={onCreateFunction}
        >
          {llmInitializing ? 'Loading Model...' : 'Create Function'}
        </button>
      </div>
      {transformFunction && (
        <>
          <JsonDisplay
            title="Transform Function"
            data={transformFunction}
            format="javascript"
            copyButtonText="Copy Function"
            editable={true}
            onDataChange={onTransformFunctionChange}
          />

          {/* Function Hash Display */}
          {transformFunctionHash && (
            <div className="mt-4 rounded-lg border bg-gray-50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="mb-1 text-sm font-medium text-gray-700">Function Hash (SHA-256)</h4>
                  <p className="mb-2 text-xs text-gray-500">Implementation-agnostic hash for semantic comparison</p>
                  <code className="break-all rounded border bg-white px-2 py-1 font-mono text-xs text-gray-800">
                    {transformFunctionHash}
                  </code>
                </div>
                <button
                  onClick={() => navigator.clipboard.writeText(transformFunctionHash)}
                  className="ml-4 rounded bg-gray-200 px-3 py-1 text-xs text-gray-700 transition-colors hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
                  title="Copy hash to clipboard"
                >
                  Copy Hash
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
