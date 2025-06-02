import { useHookstate } from '@hookstate/core'
import { useEffect } from 'react'

import { getMutableState, NO_PROXY } from '@ir-engine/hyperflux'
import { Button } from '@ir-engine/ui'
import React from 'react'
import { TargetSchemas } from './TargetRegistry'
import { Stringify, ToolRegistry } from './ToolRegistry'
import { DataTransformSection } from './components/DataTransformSection'
import { Header } from './components/Header'
import { MultipleDataSourcesSection } from './components/MultipleDataSourcesSection'
import { TargetSchemaSection } from './components/TargetSchemaSection'
import { TransformFunctionSection } from './components/TransformFunctionSection'
import type { JSONSchemaType } from './json-schema/JSONSchema'
import { createJSONTransformFunctionPrompt } from './json-schema/createJSONTransformFunctionPrompt'
import { generateJsonSchema } from './json-schema/generateJsonSchema'
import { CODING_MODELS, reloadLLM, useLLM } from './llm/useLLM'
import { createDynamicWebworker } from './utils/createDynamicWebworker'
import { hashFunctionSource } from './utils/hashFunction'

interface DataSource {
  id: string
  label: string
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
    dataSources: [] as DataSource[],
    combinedData: null as object | null,
    inputSchema: null as JSONSchemaType<any> | null,
    loading: false,
    errorMessage: null as string | null,
    selectedTargetSchema: null as JSONSchemaType<any> | null,
    transformFunction: null as string | null,
    transformFunctionHash: null as string | null,
    outputData: null as object | null,
    llmLoadProgress: 0,
    additionalPrompt: '',
    selectedModel: getStoredModel()
  })

  const llm = useLLM({
    modelId: state.selectedModel.get(),
    onProgress: (progress) => {
      state.llmLoadProgress.set(progress.progress ?? 0)
    }
  })

  // Load data sources from URL parameters on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const sourcesFromUrl: DataSource[] = []

    // Parse sources from URL parameters (source_0_label, source_0_url, source_1_label, etc.)
    let index = 0
    while (urlParams.has(`source_${index}_label`) || urlParams.has(`source_${index}_url`)) {
      const label = urlParams.get(`source_${index}_label`) || `source_${index + 1}`
      const url = urlParams.get(`source_${index}_url`) || ''

      sourcesFromUrl.push({
        id: crypto.randomUUID(),
        label,
        url,
        data: null,
        loading: false,
        errorMessage: null
      })
      index++
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

    // If no sources in URL, create one empty source
    if (sourcesFromUrl.length === 0) {
      sourcesFromUrl.push({
        id: crypto.randomUUID(),
        label: `source_1`,
        url: '',
        data: null,
        loading: false,
        errorMessage: null
      })
    }

    state.dataSources.set(sourcesFromUrl)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update URL parameters whenever data sources, additional prompt, target schema, or model change
  useEffect(() => {
    const sources = state.dataSources.get(NO_PROXY)
    const additionalPrompt = state.additionalPrompt.get()
    const selectedTargetSchema = state.selectedTargetSchema.get(NO_PROXY)
    const selectedModel = state.selectedModel.get()
    const urlParams = new URLSearchParams()

    sources.forEach((source, index) => {
      if (source.label.trim()) {
        urlParams.set(`source_${index}_label`, source.label)
      }
      if (source.url.trim()) {
        urlParams.set(`source_${index}_url`, source.url)
      }
    })

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

    // Update URL without triggering a page reload
    const newUrl = urlParams.toString()
      ? `${window.location.pathname}?${urlParams.toString()}`
      : window.location.pathname

    window.history.replaceState({}, '', newUrl)
  }, [state.dataSources, state.additionalPrompt, state.selectedTargetSchema, state.selectedModel])

  const addDataSource = () => {
    const newSource: DataSource = {
      id: crypto.randomUUID(),
      label: `source_${state.dataSources.length + 1}`,
      url: '',
      data: null,
      loading: false,
      errorMessage: null
    }
    state.dataSources.merge([newSource])
  }

  const removeDataSource = (id: string) => {
    const currentSources = state.dataSources.get(NO_PROXY)
    const filteredSources = currentSources.filter((source) => source.id !== id)
    state.dataSources.set(filteredSources)
    updateCombinedData()
  }

  const updateDataSource = (id: string, updates: Partial<DataSource>) => {
    const sourceIndex = state.dataSources.findIndex((source) => source.id.get() === id)
    if (sourceIndex !== -1) {
      state.dataSources[sourceIndex].merge(updates)
      // If label changed and source has data, update combined data
      if (updates.label && state.dataSources[sourceIndex].data.get()) {
        updateCombinedData()
      }
    }
  }

  const fetchDataForSource = async (sourceId: string) => {
    const sourceIndex = state.dataSources.findIndex((source) => source.id.get() === sourceId)
    if (sourceIndex === -1) return

    const source = state.dataSources[sourceIndex]
    const url = source.url.get().trim()

    if (!url) {
      source.errorMessage.set('Please enter a URL')
      return
    }

    // Basic URL validation
    try {
      new URL(url)
    } catch {
      source.errorMessage.set('Please enter a valid URL')
      return
    }

    source.loading.set(true)
    source.errorMessage.set(null)
    source.data.set(null)

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
          source.data.set(data)
        } catch {
          throw new Error('Response is not valid JSON')
        }
      } else {
        const data = await response.json()
        source.data.set(data)
      }

      updateCombinedData()
    } catch (error) {
      source.errorMessage.set(error instanceof Error ? error.message : 'Failed to fetch data')
    } finally {
      source.loading.set(false)
    }
  }

  const updateCombinedData = () => {
    const sources = state.dataSources.get(NO_PROXY)
    const combined: Record<string, object> = {}

    for (const source of sources) {
      if (source.data && source.label) {
        combined[source.label] = source.data
      }
    }

    if (Object.keys(combined).length > 0) {
      state.combinedData.set(combined)
      const schema = generateJsonSchema(combined)
      state.inputSchema.set(schema)
    } else {
      state.combinedData.set(null)
      state.inputSchema.set(null)
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

    if (!state.combinedData.get()) {
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
      worker.call(state.combinedData.get(NO_PROXY)!).then((response) => {
        state.outputData.set(response)
      })
    })
  }

  const handleCombinedDataChange = (newData: object) => {
    state.combinedData.set(newData)
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
    const toolRegistry = getMutableState(ToolRegistry)
    ToolRegistry.create({
      label: 'New Tool',
      description: 'A new tool created from the current state',
      input: state.inputSchema.get(NO_PROXY) as JSONSchemaType<unknown>,
      output: state.selectedTargetSchema.get(NO_PROXY) as JSONSchemaType<unknown>,
      transformation: state.transformFunction.get() as Stringify<(input: unknown) => Promise<unknown>>
    }).then((newTool) => {
      toolRegistry[newTool.hash].set(newTool)
    })
  }

  return (
    <div className="pointer-events-auto min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="mx-auto max-w-4xl space-y-6">
        <Header />

        <MultipleDataSourcesSection
          dataSources={state.dataSources.get(NO_PROXY) as DataSource[]}
          combinedData={state.combinedData.get(NO_PROXY) as object | null}
          inputSchema={state.inputSchema.get(NO_PROXY) as JSONSchemaType<any> | null}
          onAddSource={addDataSource}
          onRemoveSource={removeDataSource}
          onUpdateSource={updateDataSource}
          onFetchData={fetchDataForSource}
          onCombinedDataChange={handleCombinedDataChange}
          onInputSchemaChange={handleInputSchemaChange}
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
        />

        <DataTransformSection
          transformFunction={state.transformFunction.get()}
          outputData={state.outputData.get(NO_PROXY) as object | null}
          onTransform={onTransformClick}
          onOutputDataChange={handleOutputDataChange}
        />

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
