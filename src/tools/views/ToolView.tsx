import { hookstate, useHookstate } from '@hookstate/core'
import { useEffect } from 'react'

import transform from '@hexafield/jsonpath-object-transform'
import { getState, NO_PROXY } from '@ir-engine/hyperflux'
import { Button } from '@ir-engine/ui'
import React from 'react'
import { DataTransformSection } from '../components/DataTransformSection'
import SchemaSelectorInput from '../components/SchemaSelectorInput'
import Tabs from '../components/Tabs'
import { ToolCard } from '../components/ToolCard'
import { TransformFunctionSection } from '../components/TransformFunctionSection'
import type { JSONSchemaType } from '../json-schema/JSONSchema'
import { contentHash } from '../json-schema/contentHash'
import { createJSONTransformFunctionPrompt } from '../json-schema/createJSONTransformFunctionPrompt'
import { createJSONTransformSchemaPrompt } from '../json-schema/createJSONTransformSchemaPrompt'
import { generateJsonSchema } from '../json-schema/generateJsonSchema'
import { CODING_MODELS, reloadLLM, useLLM } from '../llm/useLLM'
import { SchemaRegistry, SHA256Hash } from '../registries/SchemaRegistry'
import { TargetRegistry } from '../registries/TargetRegistry'
import { Stringify, Tool, ToolRegistry } from '../registries/ToolRegistry'
import { createDynamicWebworker } from '../utils/createDynamicWebworker'
import { hashFunctionSource } from '../utils/hashFunction'

const tabs = [
  { label: 'Create', value: 'create' },
  { label: 'Library', value: 'library' }
]

// Generic interface for schema selection
export type SchemaSelector =
  | { kind: 'url'; url: string; schema: JSONSchemaType<any> | null; loading: boolean; errorMessage: string | null }
  | { kind: 'known'; hash: string; schema: JSONSchemaType<any> }
  | { kind: 'custom'; schema: JSONSchemaType<any> }

function ToolCreateView(): JSX.Element {
  // Load selected model from localStorage or use default
  const getStoredModel = () => {
    try {
      const stored = localStorage.getItem('selectedModel')
      if (stored && CODING_MODELS.find((m) => m.id === stored)) {
        return stored
      }
    } catch (error) {
      console.warn('Failed to load model from localStorage:', error)
    }
    return CODING_MODELS[0].id // Default to Ollama
  }

  const state = useHookstate({
    inputSchemaSelector: { kind: 'url', url: '', schema: null, loading: false, errorMessage: null } as SchemaSelector,
    outputSchemaSelector: { kind: 'url', url: '', schema: null, loading: false, errorMessage: null } as SchemaSelector,
    inputData: null as object | null,
    llmResponsePending: false,
    errorMessage: null as string | null,
    selectedModel: getStoredModel(),
    transformer: '' as string | object,
    transformerType: 'json' as 'json' | 'javascript',
    transformerHash: null as string | null,
    outputData: null as object | null,
    additionalPrompt: '',
    toolLabel: 'New Tool', // Added for tool label entry
    toolDescription: 'A new tool created from the current state' // Added for tool description entry
  })

  // Remote LLM state for API keys and LAN URLs
  const apiKey = useHookstate('')
  const ollamaUrl = useHookstate('http://localhost:11434/api/chat')

  const llm = useLLM({
    modelId: state.selectedModel.get(),
    apiKey: apiKey.get(),
    ollamaUrl: ollamaUrl.get()
  })

  // Load data sources from URL parameters on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)

    // Load additional prompt from URL
    const additionalPrompt = urlParams.get('additional_prompt') || ''
    state.additionalPrompt.set(additionalPrompt)

    // Load target schema from URL
    const targetSchemaIndex = urlParams.get('target_schema')
    if (targetSchemaIndex !== null) {
      const index = parseInt(targetSchemaIndex)
      if (!isNaN(index) && getState(TargetRegistry)[index]) {
        state.outputSchemaSelector.set({
          kind: 'known',
          hash: getState(TargetRegistry)[index].hash,
          schema: getState(TargetRegistry)[index].value
        })
      }
    }

    // Load selected model from URL
    const modelFromUrl = urlParams.get('model')
    if (modelFromUrl && CODING_MODELS.find((m) => m.id === modelFromUrl)) {
      state.selectedModel.set(modelFromUrl)
      localStorage.setItem('selectedModel', modelFromUrl)
    }

    state.inputData.set(null)
  }, [])

  // Update URL parameters whenever data sources, additional prompt, target schema, model, or ollamaUrl change
  useEffect(() => {
    const additionalPrompt = state.additionalPrompt.get()
    const selectedTargetSchema = state.outputSchemaSelector.get(NO_PROXY)
    const selectedModel = state.selectedModel.get()
    const urlParams = new URLSearchParams()

    // Add additional prompt if it exists
    if (additionalPrompt.trim()) {
      urlParams.set('additional_prompt', additionalPrompt)
    }

    // Add target schema index if one is selected
    if (selectedTargetSchema) {
      const targetSchemaIndex = Object.values(getState(TargetRegistry)).findIndex(
        (schema) => JSON.stringify(schema) === JSON.stringify(selectedTargetSchema)
      )
      if (targetSchemaIndex !== -1) {
        urlParams.set('target_schema', targetSchemaIndex.toString())
      }
    }

    // Add selected model if it's not the default
    if (selectedModel && selectedModel !== CODING_MODELS[1].id) {
      urlParams.set('model', selectedModel)
    }

    // Add ollamaUrl if it's not the default
    if (ollamaUrl.get() && ollamaUrl.get() !== 'http://localhost:11434/api/chat') {
      urlParams.set('ollama_url', ollamaUrl.get())
    }

    // Update URL without triggering a page reload
    const newUrl = urlParams.toString()
      ? `${window.location.pathname}?${urlParams.toString()}`
      : window.location.pathname

    window.history.replaceState({}, '', newUrl)
  }, [state.inputData, state.additionalPrompt, state.outputSchemaSelector, state.selectedModel, ollamaUrl])

  const onCreateFunctionClick = () => {
    if (!llm.ready) {
      state.errorMessage.set('LLM not initialized')
      console.error('LLM not initialized')
      return
    }

    if (!state.outputSchemaSelector.get().schema) {
      state.errorMessage.set('Please select a target schema')
      console.error('No target schema selected')
      return
    }

    state.llmResponsePending.set(true)
    state.errorMessage.set(null)

    const selectedTargetSchema = state.get(NO_PROXY).outputSchemaSelector.schema as JSONSchemaType<any>
    const inputSchema = state.get(NO_PROXY).inputSchemaSelector.schema as JSONSchemaType<any>

    llm
      .call(
        state.transformerType.value === 'javascript'
          ? {
              prompt: createJSONTransformFunctionPrompt({
                inputSchema,
                outputSchema: selectedTargetSchema,
                additionalInstructions: state.additionalPrompt.get()
              }),
              output: 'javascript'
            }
          : {
              prompt: createJSONTransformSchemaPrompt({
                inputSchema,
                outputSchema: selectedTargetSchema,
                additionalInstructions: state.additionalPrompt.get()
              }),
              output: 'json'
            }
      )
      .then(async (result) => {
        console.log(result)
        state.llmResponsePending.set(false)

        try {
          //result tends to be in markdown script tags...
          const cleanResponse =
            state.transformerType.value === 'javascript'
              ? result.rawResponse.replace('```javascript', '').replace('```', '').replace('\\n', '\n')
              : JSON.parse(result.rawResponse)

          state.transformer.set(cleanResponse)

          // Calculate and store the function hash
          try {
            const hash =
              state.transformerType.value === 'javascript'
                ? await hashFunctionSource(cleanResponse)
                : contentHash(cleanResponse)
            state.transformerHash.set(hash)
          } catch (error) {
            console.warn('Failed to hash function:', error)
            state.transformerHash.set(null)
          }
        } catch (error) {
          console.error('Error during transformation:', error)
          state.errorMessage.set(error instanceof Error ? error.message : 'Transformation failed')
          return
        }
      })
      .catch((error) => {
        state.llmResponsePending.set(false)
        console.error('Error during transformation:', error)
        state.errorMessage.set(error instanceof Error ? error.message : 'Transformation failed')
      })
  }

  const onTransformClick = () => {
    const cleanFunctionScript = state.transformer.get() as string
    if (state.transformerType.value === 'javascript') {
      createDynamicWebworker(cleanFunctionScript).then((worker) => {
        worker
          .call(state.inputData.get(NO_PROXY)!)
          .then((response) => {
            state.outputData.set(response)
            worker.terminate()
          })
          .catch((error) => {
            console.error('Error during transformation:', error)
            state.errorMessage.set(error instanceof Error ? error.message : 'Transformation failed')
            worker.terminate()
          })
      })
    } else {
      try {
        state.outputData.set(transform(state.inputData.get(NO_PROXY)!, state.transformer.get(NO_PROXY)))
      } catch (error) {
        console.error('Error during transformation:', error)
        state.errorMessage.set(error instanceof Error ? error.message : 'Transformation failed')
      }
    }
  }

  const handleTransformFunctionChange = async (newFunction: string) => {
    state.transformer.set(newFunction)

    // Recalculate hash when function is manually edited
    if (newFunction.trim()) {
      try {
        const hash = await hashFunctionSource(newFunction)
        state.transformerHash.set(hash)
      } catch (error) {
        console.warn('Failed to hash function:', error)
        state.transformerHash.set(null)
      }
    } else {
      state.transformerHash.set(null)
    }
  }

  const handleOutputDataChange = (newData: object) => {
    state.outputData.set(newData)
  }

  const handleModelChange = async (modelId: string) => {
    try {
      // Save to localStorage
      localStorage.setItem('selectedModel', modelId)

      // Update state
      state.selectedModel.set(modelId)
      state.errorMessage.set(null)

      // Reload LLM with new model
      await reloadLLM(modelId)
    } catch (error) {
      state.errorMessage.set(error instanceof Error ? error.message : 'Failed to load model')
    }
  }

  // Fetch and generate schema from URL for input/output
  const fetchSchemaFromUrl = async (url: string, isInput: boolean) => {
    const selectorKey = isInput ? 'inputSchemaSelector' : 'outputSchemaSelector'
    state[selectorKey].set({ kind: 'url', url, schema: null, loading: true, errorMessage: null })
    try {
      const response = await fetch(url)
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      const data = await response.json()
      state.inputData.set(data) // Store fetched data for transformation
      const schema = generateJsonSchema(data)
      state[selectorKey].set({ kind: 'url', url, schema, loading: false, errorMessage: null })
      // Add to knownSchemas
      SchemaRegistry.register(schema, `${url.split('/').pop()}`, `Automatically fetched schema from ${url}`)
    } catch (error) {
      state[selectorKey].set({
        kind: 'url',
        url,
        schema: null,
        loading: false,
        errorMessage: error instanceof Error ? error.message : 'Failed to fetch schema'
      })
    }
  }

  // Handler for selecting a known schema
  const handleKnownSchemaSelect = (hash: SHA256Hash, isInput: boolean) => {
    const schema = getState(SchemaRegistry).schemas[hash]?.schema
    if (!schema) return
    const selectorKey = isInput ? 'inputSchemaSelector' : 'outputSchemaSelector'
    state[selectorKey].set({ kind: 'known', hash, schema })
  }

  // Update onCreateTool to use selected schemas
  const onCreateTool = () => {
    const inputSel = state.inputSchemaSelector.get()
    const outputSel = state.outputSchemaSelector.get()
    const inputSchema =
      inputSel.kind === 'custom' || inputSel.kind === 'known' || inputSel.kind === 'url' ? inputSel.schema : null
    const outputSchema =
      outputSel.kind === 'custom' || outputSel.kind === 'known' || outputSel.kind === 'url' ? outputSel.schema : null
    if (!inputSchema || !outputSchema) {
      state.errorMessage.set('Input and output schemas must be selected')
      return
    }
    ToolRegistry.create({
      label: state.toolLabel.get(),
      description: state.toolDescription.get(),
      input: inputSchema as JSONSchemaType<unknown>,
      output: outputSchema as JSONSchemaType<unknown>,
      transformation: state.transformer.get() as Stringify<(input: unknown) => Promise<unknown>>
    }).then((hash) => {
      // done - @todo add UI feedback
      console.log('Tool created successfully:', hash)
    })
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Schema selection UI */}
      <SchemaSelectorInput
        label="Input Schema"
        selectorState={state.inputSchemaSelector.get()}
        onUrlChange={(url) => fetchSchemaFromUrl(url, true)}
        onKnownSchemaSelect={(schemaId) => handleKnownSchemaSelect(schemaId, true)}
        inputSchema={state.inputSchemaSelector.schema.get(NO_PROXY) as JSONSchemaType<any> | null}
        jsonData={state.inputData.get(NO_PROXY) as object | null}
      />
      <SchemaSelectorInput
        label="Output Schema"
        selectorState={state.outputSchemaSelector.get()}
        onUrlChange={(url) => fetchSchemaFromUrl(url, false)}
        onKnownSchemaSelect={(schemaId) => handleKnownSchemaSelect(schemaId, false)}
        inputSchema={state.outputSchemaSelector.schema.get(NO_PROXY) as JSONSchemaType<any> | null}
      />

      <TransformFunctionSection
        selectedTargetSchema={state.outputSchemaSelector.schema.get(NO_PROXY) as JSONSchemaType<any> | null}
        inputSchema={state.inputSchemaSelector.schema.get(NO_PROXY) as JSONSchemaType<any> | null}
        transformer={state.transformer.get()}
        transformerType={state.transformerType.get()}
        transformerHash={state.transformerHash.get()}
        additionalPrompt={state.additionalPrompt.get()}
        selectedModel={state.selectedModel.get()}
        llmResponsePending={state.llmResponsePending.get()}
        onCreateFunction={onCreateFunctionClick}
        onAdditionalPromptChange={(prompt: string) => state.additionalPrompt.set(prompt)}
        onSwitchTransformType={(type: 'json' | 'javascript') => state.transformerType.set(type)}
        onTransformerChange={handleTransformFunctionChange}
        onModelChange={handleModelChange}
        llmLoadProgress={llm.progress || 0}
        llmInitializing={llm.initializing}
        // Pass API key and LAN URL setters for remote LLMs
        setApiKey={apiKey.set}
        setOllamaUrl={ollamaUrl.set}
        apiKey={apiKey.get()}
        ollamaUrl={ollamaUrl.get()}
      />

      <DataTransformSection
        transformer={state.transformer.get()}
        outputData={state.outputData.get(NO_PROXY) as object | null}
        onTransform={onTransformClick}
        onOutputDataChange={handleOutputDataChange}
      />

      {/* Tool label and description entry fields */}
      <div className="mt-4 flex flex-col gap-2">
        <label className="font-medium">Tool Label</label>
        <input
          className="rounded border px-2 py-1"
          type="text"
          value={state.toolLabel.get()}
          onChange={(e) => state.toolLabel.set(e.target.value)}
          placeholder="Enter tool label"
        />
        <label className="mt-2 font-medium">Tool Description</label>
        <input
          className="rounded border px-2 py-1"
          type="text"
          value={state.toolDescription.get()}
          onChange={(e) => state.toolDescription.set(e.target.value)}
          placeholder="Enter tool description"
        />
      </div>

      <Button
        className="mt-4"
        variant="primary"
        disabled={
          !state.inputSchemaSelector.get().schema ||
          !state.outputSchemaSelector.get().schema ||
          !state.transformer.value
        }
        onClick={onCreateTool}
      >
        Create
      </Button>
    </div>
  )
}

function ToolRegistryView(): JSX.Element {
  const tools = useHookstate(getState(ToolRegistry).tools)
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h2 className="mb-4 text-xl font-semibold">Tool Library</h2>
      <ul className="space-y-4">
        {Object.values(tools.get(NO_PROXY)).map((tool: Tool) => (
          <ToolCard key={tool.hash} tool={tool} />
        ))}
      </ul>
    </div>
  )
}

const tabState = hookstate<string>('create' as 'create' | 'library')

function ToolView(): JSX.Element {
  const tab = useHookstate(tabState)
  return (
    <div className="pointer-events-auto min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Tabs tabs={tabs} onChange={tab.set} value={tab.value} />
      <div className="mx-auto max-w-4xl space-y-6">
        {tab.value === 'create' && <ToolCreateView />}
        {tab.value === 'library' && <ToolRegistryView />}
      </div>
    </div>
  )
}

export default ToolView
