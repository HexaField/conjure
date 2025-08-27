import { useHookstate } from '@hookstate/core'
import React, { useEffect } from 'react'
import type { JSONSchemaType } from '../json-schema/JSONSchema'
import { CODING_MODELS } from '../llm/useLLM'
import { JsonDisplay } from './JsonDisplay'

interface TransformFunctionSectionProps {
  selectedTargetSchema: JSONSchemaType<any> | null
  inputSchema: JSONSchemaType<any> | null
  transformer: string | object | null
  transformerType: 'json' | 'javascript'
  transformerHash: string | null
  additionalPrompt: string
  selectedModel: string
  llmResponsePending: boolean
  onCreateFunction: () => void
  onAdditionalPromptChange: (prompt: string) => void
  onSwitchTransformType: (type: 'json' | 'javascript') => void
  onTransformerChange: (newFunction: string) => void
  onModelChange: (modelId: string) => void
  llmLoadProgress: number
  llmInitializing: boolean
  setApiKey?: (key: string) => void
  setOllamaUrl?: (url: string) => void
  apiKey?: string
  ollamaUrl?: string
}

export function TransformFunctionSection({
  selectedTargetSchema,
  inputSchema,
  transformer,
  transformerType,
  transformerHash,
  additionalPrompt,
  selectedModel,
  llmResponsePending,
  onCreateFunction,
  onAdditionalPromptChange,
  onSwitchTransformType,
  onTransformerChange,
  onModelChange,
  llmLoadProgress,
  llmInitializing,
  setApiKey,
  setOllamaUrl,
  apiKey,
  ollamaUrl
}: TransformFunctionSectionProps) {
  const selectedModelInfo = CODING_MODELS.find((m) => m.id === selectedModel)

  const localApiKey = useHookstate(apiKey || '')
  const localOllamaUrl = useHookstate(
    ollamaUrl || (selectedModelInfo?.provider === 'ollama' ? selectedModelInfo.apiUrl || '' : '')
  )

  useEffect(() => {
    if (apiKey !== undefined) localApiKey.set(apiKey)
  }, [apiKey])

  useEffect(() => {
    if (ollamaUrl !== undefined) localOllamaUrl.set(ollamaUrl)
  }, [ollamaUrl])

  const llmReady = selectedModelInfo?.provider === 'mlc' ? llmLoadProgress >= 1 && !llmInitializing : true

  return (
    <div className="rounded-xl bg-white p-6 shadow-lg">
      <div className="mb-4 flex items-center justify-between">
        <label htmlFor="targetSchema" className="mb-2 block text-sm font-medium text-gray-700">
          Create Transform Function
        </label>
        {(llmLoadProgress < 1 || llmInitializing) && !llmReady && (
          <div className="text-sm text-gray-500">{`Loading LLM: ${Math.round(llmLoadProgress * 100)}%`}</div>
        )}
      </div>
      {/* Transformer Type Selection */}
      <div className="mb-4">
        <label htmlFor="transformerType" className="mb-2 block text-sm font-medium text-gray-700">
          Transformer Type
        </label>
        <select
          id="transformerType"
          value={transformerType}
          onChange={(e) => onSwitchTransformType(e.target.value as 'json' | 'javascript')}
          className="w-full rounded-md border border-gray-300 px-3 py-2 outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
        >
          <option value="json">JSON</option>
          <option value="javascript">JavaScript</option>
        </select>
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
        {/* Remote LLM API key or URL input */}
        {selectedModelInfo?.provider === 'openai' && (
          <div className="mt-2">
            <label className="block text-xs font-medium text-gray-700">OpenAI API Key</label>
            <input
              type="password"
              className="w-full rounded border px-2 py-1 text-xs"
              value={localApiKey.get()}
              onChange={(e) => {
                localApiKey.set(e.target.value)
                setApiKey?.(e.target.value)
              }}
              placeholder="sk-..."
              autoComplete="off"
            />
          </div>
        )}
        {selectedModelInfo?.provider === 'anthropic' && (
          <div className="mt-2">
            <label className="block text-xs font-medium text-gray-700">Anthropic API Key</label>
            <input
              type="password"
              className="w-full rounded border px-2 py-1 text-xs"
              value={localApiKey.get()}
              onChange={(e) => {
                localApiKey.set(e.target.value)
                setApiKey?.(e.target.value)
              }}
              placeholder="claude-..."
              autoComplete="off"
            />
          </div>
        )}
        {selectedModelInfo?.provider === 'google' && (
          <div className="mt-2">
            <label className="block text-xs font-medium text-gray-700">Google API Key</label>
            <input
              type="password"
              className="w-full rounded border px-2 py-1 text-xs"
              value={localApiKey.get()}
              onChange={(e) => {
                localApiKey.set(e.target.value)
                setApiKey?.(e.target.value)
              }}
              placeholder="AIza..."
              autoComplete="off"
            />
          </div>
        )}
        {selectedModelInfo?.provider === 'ollama' && (
          <div className="mt-2">
            <label className="block text-xs font-medium text-gray-700">Ollama LAN URL</label>
            <input
              type="text"
              className="w-full rounded border px-2 py-1 text-xs"
              value={localOllamaUrl.get()}
              onChange={(e) => {
                localOllamaUrl.set(e.target.value)
                setOllamaUrl?.(e.target.value)
              }}
              placeholder="http://192.168.1.100:11434/api/chat"
              autoComplete="off"
            />
          </div>
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
          disabled={!selectedTargetSchema || !inputSchema || !llmReady || llmResponsePending}
          onClick={onCreateFunction}
        >
          {llmInitializing
            ? 'Loading Model...'
            : llmResponsePending
            ? 'Generating...'
            : 'Create ' + (transformerType === 'json' ? 'Schema' : 'Function')}
        </button>
      </div>
      <JsonDisplay
        title="Transform Function"
        data={transformer}
        format={typeof transformer === 'string' ? 'javascript' : 'json'}
        copyButtonText="Copy Function"
        editable={true}
        onDataChange={onTransformerChange}
      />

      {/* Function Hash Display */}
      {transformerHash && (
        <div className="mt-4 rounded-lg border bg-gray-50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="mb-1 text-sm font-medium text-gray-700">Function Hash (SHA-256)</h4>
              <p className="mb-2 text-xs text-gray-500">Implementation-agnostic hash for semantic comparison</p>
              <code className="break-all rounded border bg-white px-2 py-1 font-mono text-xs text-gray-800">
                {transformerHash}
              </code>
            </div>
            <button
              onClick={() => navigator.clipboard.writeText(transformerHash)}
              className="ml-4 rounded bg-gray-200 px-3 py-1 text-xs text-gray-700 transition-colors hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
              title="Copy hash to clipboard"
            >
              Copy Hash
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
