import { useHookstate } from '@hookstate/core'
import { useEffect } from 'react'

import { NO_PROXY } from '@ir-engine/hyperflux'
import { Button } from '@ir-engine/ui'
import React from 'react'
import { TargetSchemas } from './TargetRegistry'
import { Stringify, ToolRegistry } from './ToolRegistry'
import { DataTransformSection } from './components/DataTransformSection'
import { Header } from './components/Header'
import { TargetSchemaSection } from './components/TargetSchemaSection'
import { TransformFunctionSection } from './components/TransformFunctionSection'
import { UrlInputSection } from './components/URLInputSection'
import type { JSONSchemaType } from './json-schema/JSONSchema'
import { createJSONTransformFunctionPrompt } from './json-schema/createJSONTransformFunctionPrompt'
import { generateJsonSchema } from './json-schema/generateJsonSchema'
import { CODING_MODELS, reloadLLM, useLLM } from './llm/useLLM'
import { createDynamicWebworker } from './utils/createDynamicWebworker'
import { hashFunctionSource } from './utils/hashFunction'

interface DataSource {
  url: string
  data: object | null
  loading: boolean
  errorMessage: string | null
}

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
    dataSources: {
      url: '',
      data: null as object | null,
      loading: false,
      errorMessage: null as string | null
    } as DataSource,
    inputSchema: null as JSONSchemaType<any> | null,
    loading: false,
    errorMessage: null as string | null,
    selectedTargetSchema: null as JSONSchemaType<any> | null,
    transformFunction: null as string | null,
    transformFunctionHash: null as string | null,
    outputData: null as object | null,
    llmLoadProgress: 0,
    additionalPrompt: '',
    selectedModel: getStoredModel(),
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

      state.dataSources.set({
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
        state.selectedTargetSchema.set(TargetSchemas[index])
      }
    }

    // Load selected model from URL
    const modelFromUrl = urlParams.get('model')
    if (modelFromUrl && CODING_MODELS.find((m) => m.id === modelFromUrl)) {
      state.selectedModel.set(modelFromUrl)
      localStorage.setItem('selectedModel', modelFromUrl)
    }

    state.dataSources.set({
      url: '',
      data: null,
      loading: false,
      errorMessage: null
    })
  }, [])

  // Update URL parameters whenever data sources, additional prompt, target schema, model, or ollamaUrl change
  useEffect(() => {
    const source = state.dataSources.get(NO_PROXY)
    const additionalPrompt = state.additionalPrompt.get()
    const selectedTargetSchema = state.selectedTargetSchema.get(NO_PROXY)
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
  }, [state.dataSources, state.additionalPrompt, state.selectedTargetSchema, state.selectedModel, ollamaUrl])

  const fetchDataForSource = async () => {
    const source = state.dataSources
    if (!source.get(NO_PROXY)?.url) {
      state.errorMessage.set('No data source selected')
      return
    }

    // Ensure URL is trimmed and valid
    const url = source.url.get().trim()

    if (!url) {
      state.dataSources.errorMessage.set('Please enter a URL')
      return
    }

    // Basic URL validation
    try {
      new URL(url)
    } catch {
      state.dataSources.errorMessage.set('Please enter a valid URL')
      return
    }

    state.dataSources.loading.set(true)
    state.dataSources.errorMessage.set(null)
    state.dataSources.data.set(null)

    try {
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const contentType = response.headers.get('content-type')
      if (!contentType?.includes('application/json')) {
        // Try to parse as JSON anyway, in case the content-type is wrong
        const text = await response.text()
        try {
          const data = JSON.parse(text)
          state.dataSources.data.set(data)
        } catch {
          throw new Error('Response is not valid JSON')
        }
      } else {
        const data = await response.json()
        const schema = generateJsonSchema(data)
        state.inputSchema.set(schema)
        state.dataSources.data.set(data)
      }
    } catch (error) {
      state.dataSources.errorMessage.set(error instanceof Error ? error.message : 'Failed to fetch data')
    } finally {
      state.dataSources.loading.set(false)
    }
  }

  const onCreateFunctionClick = () => {
    if (!llm.ready) {
      state.errorMessage.set('LLM not initialized')
      return
    }

    if (!state.selectedTargetSchema.get()) {
      state.errorMessage.set('Please select a target schema')
      return
    }

    if (!state.dataSources.data.get()) {
      state.errorMessage.set('No JSON data to transform')
      return
    }

    state.loading.set(true)
    state.errorMessage.set(null)

    const selectedTargetSchema = state.get(NO_PROXY).selectedTargetSchema as JSONSchemaType<any>
    const inputSchema = state.get(NO_PROXY).inputSchema as JSONSchemaType<any>

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
        .call(state.dataSources.data.get(NO_PROXY)!)
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

  const handleCombinedDataChange = (newData: object) => {
    state.dataSources.data.set(newData)
    // Regenerate schema when combined data changes
    const schema = generateJsonSchema(newData)
    state.inputSchema.set(schema)
  }

  const handleInputSchemaChange = (newSchema: JSONSchemaType<any>) => {
    state.inputSchema.set(newSchema)
  }

  const handleTargetSchemaChange = (newSchema: JSONSchemaType<any>) => {
    state.selectedTargetSchema.set(newSchema)
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

  const onCreateTool = () => {
    ToolRegistry.create({
      label: state.toolLabel.get(), // Use state value
      description: state.toolDescription.get(), // Use state value
      input: state.inputSchema.get(NO_PROXY) as JSONSchemaType<unknown>,
      output: state.selectedTargetSchema.get(NO_PROXY) as JSONSchemaType<unknown>,
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

        <UrlInputSection
          url={state.dataSources.url.get()}
          loading={state.dataSources.loading.get()}
          errorMessage={state.dataSources.errorMessage.get()}
          jsonData={state.dataSources.data.get({ noproxy: true }) as object | null}
          inputSchema={state.inputSchema.get({ noproxy: true }) as JSONSchemaType<unknown> | null}
          onUrlChange={(url: string) => state.dataSources.url.set(url)}
          onSubmit={fetchDataForSource}
        />

        <TargetSchemaSection
          selectedTargetSchema={
            state.selectedTargetSchema.get({
              noproxy: true
            }) as JSONSchemaType<any> | null
          }
          onTargetSchemaChange={(schema: JSONSchemaType<any> | null) => state.selectedTargetSchema.set(schema)}
          onTargetSchemaEdit={handleTargetSchemaChange}
        />

        <TransformFunctionSection
          selectedTargetSchema={
            state.selectedTargetSchema.get({
              noproxy: true
            }) as JSONSchemaType<any> | null
          }
          inputSchema={state.inputSchema.get(NO_PROXY) as JSONSchemaType<any> | null}
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
          disabled={!state.inputSchema.value || !state.selectedTargetSchema.value || !state.transformFunction.value}
          onClick={onCreateTool}
        >
          Create
        </Button>
      </div>
    </div>
  )
}

export default App
