import { useHookstate } from '@hookstate/core'
import { useEffect } from 'react'

import { getState, NO_PROXY } from '@ir-engine/hyperflux'
import { Button } from '@ir-engine/ui'
import React from 'react'
import { SchemaRegistry, SHA256Hash } from './SchemaRegistry'
import { TargetSchemas } from './TargetRegistry'
import { Stringify, ToolRegistry } from './ToolRegistry'
import { DataTransformSection } from './components/DataTransformSection'
import { Header } from './components/Header'
import SchemaSelectorInput from './components/SchemaSelectorInput'
import { TransformFunctionSection } from './components/TransformFunctionSection'
import type { JSONSchemaType } from './json-schema/JSONSchema'
import { createJSONTransformFunctionPrompt } from './json-schema/createJSONTransformFunctionPrompt'
import { generateJsonSchema } from './json-schema/generateJsonSchema'
import { CODING_MODELS, reloadLLM, useLLM } from './llm/useLLM'
import { createDynamicWebworker } from './utils/createDynamicWebworker'
import { hashFunctionSource } from './utils/hashFunction'

// Generic interface for schema selection
export type SchemaSelector =
  | { kind: 'url'; url: string; schema: JSONSchemaType<any> | null; loading: boolean; errorMessage: string | null }
  | { kind: 'known'; hash: string; schema: JSONSchemaType<any> }
  | { kind: 'custom'; schema: JSONSchemaType<any> }

function App(): JSX.Element {
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
    return CODING_MODELS[1].id // Default to Qwen2.5-Coder-7B
  }

  const state = useHookstate({
    inputSchemaSelector: { kind: 'url', url: '', schema: null, loading: false, errorMessage: null } as SchemaSelector,
    outputSchemaSelector: { kind: 'url', url: '', schema: null, loading: false, errorMessage: null } as SchemaSelector,
    inputData: null as object | null,
    loading: false,
    errorMessage: null as string | null,
    selectedModel: getStoredModel(),
    transformFunction: null as string | null,
    transformFunctionHash: null as string | null,
    outputData: null as object | null,
    llmLoadProgress: 0,
    additionalPrompt: '',
    toolLabel: 'New Tool', // Added for tool label entry
    toolDescription: 'A new tool created from the current state' // Added for tool description entry
  })

  // Remote LLM state for API keys and LAN URLs
  const apiKey = useHookstate('')
  const ollamaUrl = useHookstate('http://localhost:11434/api/chat')

  const llm = useLLM({
    modelId: state.selectedModel.get(),
    onProgress: (progress) => {
      state.llmLoadProgress.set(progress.progress ?? 0)
    },
    apiKey: apiKey.get(),
    ollamaUrl: ollamaUrl.get()
  })

  // Load data sources from URL parameters on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)

    if (urlParams.has(`source_url`)) {
      const url = urlParams.get(`source_url`) || ''

      state.inputData.set({
        url,
        data: null,
        loading: false,
        errorMessage: null
      })
    }

    // Load additional prompt from URL
    const additionalPrompt = urlParams.get('additional_prompt') || ''
    state.additionalPrompt.set(additionalPrompt)

    // Load target schema from URL
    const targetSchemaIndex = urlParams.get('target_schema')
    if (targetSchemaIndex !== null) {
      const index = parseInt(targetSchemaIndex)
      if (!isNaN(index) && TargetSchemas[index]) {
        state.outputSchemaSelector.set({
          kind: 'known',
          hash: TargetSchemas[index].id,
          schema: TargetSchemas[index]
        })
      }
    }

    // Load selected model from URL
    const modelFromUrl = urlParams.get('model')
    if (modelFromUrl && CODING_MODELS.find((m) => m.id === modelFromUrl)) {
      state.selectedModel.set(modelFromUrl)
      localStorage.setItem('selectedModel', modelFromUrl)
    }

    state.inputData.set({
      url: '',
      data: null,
      loading: false,
      errorMessage: null
    })
  }, [])

  // Update URL parameters whenever data sources, additional prompt, target schema, model, or ollamaUrl change
  useEffect(() => {
    const source = state.inputData.get(NO_PROXY)
    const additionalPrompt = state.additionalPrompt.get()
    const selectedTargetSchema = state.outputSchemaSelector.get(NO_PROXY)
    const selectedModel = state.selectedModel.get()
    const urlParams = new URLSearchParams()

    // if (source.url.trim()) {
    //   urlParams.set(`source_url`, source.url)
    // }

    // Add additional prompt if it exists
    if (additionalPrompt.trim()) {
      urlParams.set('additional_prompt', additionalPrompt)
    }

    // Add target schema index if one is selected
    if (selectedTargetSchema) {
      const targetSchemaIndex = TargetSchemas.findIndex(
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

    state.loading.set(true)
    state.errorMessage.set(null)

    const selectedTargetSchema = state.get(NO_PROXY).outputSchemaSelector.schema as JSONSchemaType<any>
    const inputSchema = state.get(NO_PROXY).inputSchemaSelector.schema as JSONSchemaType<any>

    llm
      .call({
        prompt: createJSONTransformFunctionPrompt({
          inputSchema,
          outputSchema: selectedTargetSchema,
          additionalInstructions: state.additionalPrompt.get()
        }),
        output: 'javascript'
      })
      .then(async (result) => {
        console.log(result)

        //result tends to be in markdown script tags...
        const cleanFunctionScript = result.rawResponse
          .replace('```javascript', '')
          .replace('```', '')
          .replace('\\n', '\n')

        state.transformFunction.set(cleanFunctionScript)

        // Calculate and store the function hash
        try {
          const hash = await hashFunctionSource(cleanFunctionScript)
          state.transformFunctionHash.set(hash)
        } catch (error) {
          console.warn('Failed to hash function:', error)
          state.transformFunctionHash.set(null)
        }
      })
  }

  const onTransformClick = () => {
    const cleanFunctionScript = state.transformFunction.get() as string
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
  }

  const handleTransformFunctionChange = async (newFunction: string) => {
    state.transformFunction.set(newFunction)

    // Recalculate hash when function is manually edited
    if (newFunction.trim()) {
      try {
        const hash = await hashFunctionSource(newFunction)
        state.transformFunctionHash.set(hash)
      } catch (error) {
        console.warn('Failed to hash function:', error)
        state.transformFunctionHash.set(null)
      }
    } else {
      state.transformFunctionHash.set(null)
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
      state.llmLoadProgress.set(0)
      state.errorMessage.set(null)

      // Reload LLM with new model
      await reloadLLM(modelId, (progress) => {
        state.llmLoadProgress.set(progress.progress ?? 0)
      })
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
      transformation: state.transformFunction.get() as Stringify<(input: unknown) => Promise<unknown>>
    }).then((hash) => {
      // done - @todo add UI feedback
      console.log('Tool created successfully:', hash)
    })
  }

  return (
    <div className="pointer-events-auto min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="mx-auto max-w-4xl space-y-6">
        <Header />

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
          transformFunction={state.transformFunction.get()}
          transformFunctionHash={state.transformFunctionHash.get()}
          additionalPrompt={state.additionalPrompt.get()}
          selectedModel={state.selectedModel.get()}
          onCreateFunction={onCreateFunctionClick}
          onAdditionalPromptChange={(prompt: string) => state.additionalPrompt.set(prompt)}
          onTransformFunctionChange={handleTransformFunctionChange}
          onModelChange={handleModelChange}
          llmLoadProgress={state.llmLoadProgress.value}
          llmInitializing={llm.initializing}
          // Pass API key and LAN URL setters for remote LLMs
          setApiKey={apiKey.set}
          setOllamaUrl={ollamaUrl.set}
          apiKey={apiKey.get()}
          ollamaUrl={ollamaUrl.get()}
        />

        <DataTransformSection
          transformFunction={state.transformFunction.get()}
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
            !state.transformFunction.value
          }
          onClick={onCreateTool}
        >
          Create
        </Button>
      </div>
    </div>
  )
}

export default App
