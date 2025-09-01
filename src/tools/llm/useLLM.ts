import { hookstate, useHookstate } from '@hookstate/core'
import { CreateMLCEngine, type MLCEngineInterface } from '@mlc-ai/web-llm'
import { useEffect } from 'react'

/**
 * Options for calling the LLM with structured output
 */
export interface LLMCallOptions {
  /** The prompt to send to the LLM */
  prompt: string
  /** Expected output format */
  /** @todo add plaintext and xml support */
  output: 'json' | 'javascript'
  /** Temperature for response generation (0.0 to 1.0) */
  temperature?: number
  /** Maximum number of tokens to generate */
  maxTokens?: number
}

/**
 * Response from the LLM call
 */
export interface LLMResponse<T = unknown> {
  /** Parsed and validated data (null if validation failed) */
  data: T | null
  /** Raw text response from the LLM */
  rawResponse: string
  /** Whether the response passed schema validation */
  isValid: boolean
  /** Validation error messages if validation failed */
  validationErrors?: string[]
}

/**
 * Main interface for the LLM module
 */
export interface LLMModule {
  /** Call the LLM with a prompt and schema */
  call: <T = unknown>(options: LLMCallOptions) => Promise<LLMResponse<T>>
  /** Check if the LLM is ready to use */
  ready: boolean
  /** Check if the LLM is currently initializing */
  initializing: boolean
  /** Get information about the loaded model */
  getModelInfo: () => { modelId: string }
  /** Progress of the LLM loading (0 to 1) */
  progress: number
}

/**
 * Available coding models for selection
 */
export interface CodingModel {
  id: string
  name: string
  description: string
  info: string
  provider: 'mlc' | 'openai' | 'anthropic' | 'google' | 'ollama'
  apiUrl?: string // For remote models
  apiKeyEnvVar?: string // For remote models
}

/**
 * Configuration options for initializing the LLM
 */
export interface LLMInitOptions {
  /** Model ID to load (defaults to Llama-3.2-3B-Instruct-q4f32_1-MLC) */
  modelId?: string
}

/**
 * Available coding models optimized for code generation
 */
export const CODING_MODELS: CodingModel[] = [
  {
    id: 'gpt-oss:20b',
    name: 'Ollama gpt-oss:20b (LAN)',
    description: `gpt-oss:20b via Ollama)`,
    info: `Must run Ollama with \`OLLAMA_ORIGINS='https://conjure.world' ollama serve\``,
    provider: 'ollama',
    apiUrl: 'http://localhost:11434/api/chat', // Default, user can override
    apiKeyEnvVar: ''
  },
  {
    id: 'Hermes-3-Llama-3.1-8B-q4f32_1-MLC',
    name: 'Hermes 3 Llama 8B',
    description: 'Excellent instruction following and code reasoning',
    info: 'Medium-Large | 8B',
    provider: 'mlc'
  },
  {
    id: 'Qwen2.5-Coder-14B-Instruct-q4f32_1-MLC',
    name: 'Qwen2.5 Coder 14B',
    description: 'High-quality code generation for complex tasks',
    info: 'Large | 14B',
    provider: 'mlc'
  },
  {
    id: 'DeepSeek-R1-Distill-Qwen-7B-q4f32_1-MLC',
    name: 'DeepSeek R1 Distill 7B',
    description: 'Advanced reasoning capabilities for complex coding problems',
    info: 'Medium | 7B',
    provider: 'mlc'
  },
  {
    id: 'openai-o3-mini-high',
    name: 'OpenAI o3-mini-high',
    description: 'OpenAI GPT-4o (o3-mini-high) for high-quality code generation',
    info: 'Cloud | Proprietary',
    provider: 'openai',
    apiUrl: 'https://api.openai.com/v1/chat/completions',
    apiKeyEnvVar: 'OPENAI_API_KEY'
  },
  {
    id: 'claude-sonnet-3.7',
    name: 'Claude Sonnet 3.7',
    description: 'Anthropic Claude Sonnet 3.7 for advanced reasoning',
    info: 'Cloud | Proprietary',
    provider: 'anthropic',
    apiUrl: 'https://api.anthropic.com/v1/messages',
    apiKeyEnvVar: 'ANTHROPIC_API_KEY'
  },
  {
    id: 'gemini-2.5',
    name: 'Gemini 2.5',
    description: 'Google Gemini 2.5 for code and reasoning',
    info: 'Cloud | Proprietary',
    provider: 'google',
    apiUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent',
    apiKeyEnvVar: 'GOOGLE_API_KEY'
  }
]

/**
 * Initialize the LLM engine with a specific model
 */
async function initializeEngine(modelId: string = 'Llama-3.2-3B-Instruct-q4f32_1-MLC'): Promise<MLCEngineInterface> {
  try {
    console.log(`Initializing LLM engine with model: ${modelId}`)
    return await CreateMLCEngine(modelId, {
      initProgressCallback: (report) => {
        console.log(`Loading progress: ${report.text}`)
        llm.progress.set(report.progress ?? 0)
      }
    })
  } catch (error) {
    console.error('Failed to initialize LLM engine:', error)
    throw new Error(`Failed to initialize LLM: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Extract JSON from LLM response text
 */
function extractJSON(text: string): unknown {
  // Try to find JSON in the response
  // Look for content between ```json and ``` or just try to parse the whole thing
  const jsonBlockMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/)

  if (jsonBlockMatch) {
    try {
      return JSON.parse(jsonBlockMatch[1])
    } catch {
      // Fall through to try parsing the whole text
    }
  }

  // Try to find JSON object in the text
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0])
    } catch {
      // Fall through
    }
  }

  // Last resort: try to parse the entire text
  try {
    return JSON.parse(text.trim())
  } catch {
    throw new Error(`Could not extract valid JSON from response: ${text}`)
  }
}

function extractJavascript(text: string): unknown {
  // Try to find JSON in the response
  // Look for content between ```json and ``` or just try to parse the whole thing
  const javascriptBlockMatch = text.match(/```javascript\s*([\s\S]*?)\s*```/)

  if (javascriptBlockMatch) {
    try {
      return javascriptBlockMatch[1]
    } catch {
      throw new Error(`Could not extract valid javascript from response: ${text}`)
    }
  }
}

/**
 * Call the LLM with a prompt and JSON schema for structured output
 */
async function callMLC<T = unknown>(engine: MLCEngineInterface, options: LLMCallOptions): Promise<LLMResponse<T>> {
  const { prompt, temperature = 0.7, maxTokens = 1000 } = options

  console.log('calling prompt:', prompt)

  try {
    const response = await engine.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature,
      max_tokens: maxTokens
    })

    const rawResponse = response.choices[0]?.message?.content || ''

    console.log('rawResponse:', rawResponse)
    if (!rawResponse) {
      throw new Error('Empty response from LLM')
    }

    if (options.output === 'json') {
      // Extract and parse JSON from the response
      let parsedData: unknown
      try {
        parsedData = extractJSON(rawResponse)
      } catch (error) {
        return {
          data: null,
          rawResponse,
          isValid: false,
          validationErrors: [`JSON parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
        }
      }

      return {
        data: parsedData as T,
        rawResponse,
        isValid: true
      }
    }
    if (options.output === 'javascript') {
      // Extract javascript from the response
      let parsedData: unknown
      try {
        parsedData = extractJavascript(rawResponse)
      } catch (error) {
        return {
          data: null,
          rawResponse,
          isValid: false,
          validationErrors: [`Javascript parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
        }
      }

      return {
        data: parsedData as T,
        rawResponse,
        isValid: true
      }
    }
    return {
      data: rawResponse as T,
      rawResponse,
      isValid: true
    }
  } catch (error) {
    throw new Error(`LLM call failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Add remote LLM call support
async function callRemoteLLM<T = unknown>(
  model: CodingModel,
  options: LLMCallOptions,
  apiKey: string,
  customUrl?: string
): Promise<LLMResponse<T>> {
  const { prompt, temperature = 0.7, maxTokens = 1000 } = options
  let url = model.apiUrl
  if (model.provider === 'ollama' && customUrl) url = customUrl

  let headers: Record<string, string> = { 'Content-Type': 'application/json' }
  let body: any = {}

  if (model.provider === 'openai') {
    headers['Authorization'] = `Bearer ${apiKey}`
    body = {
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature,
      max_tokens: maxTokens
    }
  } else if (model.provider === 'anthropic') {
    headers['x-api-key'] = apiKey
    body = {
      model: 'claude-3-sonnet-20240229',
      max_tokens: maxTokens,
      temperature,
      messages: [{ role: 'user', content: prompt }]
    }
  } else if (model.provider === 'google') {
    url = `${url}?key=${apiKey}`
    body = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature, maxOutputTokens: maxTokens }
    }
  } else if (model.provider === 'ollama') {
    body = {
      model: model.id,
      messages: [{ role: 'user', content: prompt }],
      stream: false
    }
  }

  const response = await fetch(url!, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  })
  if (!response.ok) throw new Error(`Remote LLM error: ${response.status} ${response.statusText}`)
  const data = await response.json()

  let rawResponse = ''
  if (model.provider === 'openai') rawResponse = data.choices?.[0]?.message?.content || ''
  else if (model.provider === 'anthropic') rawResponse = data.content?.[0]?.text || ''
  else if (model.provider === 'google') rawResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  else if (model.provider === 'ollama') rawResponse = data.message?.content || ''

  if (options.output === 'json') {
    let parsedData: unknown
    try {
      parsedData = extractJSON(rawResponse)
    } catch (error) {
      return {
        data: null,
        rawResponse,
        isValid: false,
        validationErrors: [`JSON parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      }
    }
    return { data: parsedData as T, rawResponse, isValid: true }
  }
  if (options.output === 'javascript') {
    let parsedData: unknown
    try {
      parsedData = extractJavascript(rawResponse)
    } catch (error) {
      return {
        data: null,
        rawResponse,
        isValid: false,
        validationErrors: [`Javascript parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      }
    }
    return { data: parsedData as T, rawResponse, isValid: true }
  }
  return { data: rawResponse as T, rawResponse, isValid: true }
}

const llm = hookstate({
  engine: null as null | MLCEngineInterface,
  initializing: false,
  progress: 0,
  currentModelId: null as string | null
})

/**
 * Reload the LLM with a new model
 */
export async function reloadLLM(modelId: string): Promise<void> {
  if (llm.initializing.value) {
    throw new Error('LLM is already initializing')
  }

  llm.initializing.set(true)
  llm.engine.set(null)

  try {
    const newEngine = await initializeEngine(modelId)
    llm.engine.set(newEngine)
    llm.currentModelId.set(modelId)
  } finally {
    llm.initializing.set(false)
  }
}

/**
 * Main initialization function that returns the LLM module interface
 */
export function useLLM(options: LLMInitOptions & { apiKey?: string; ollamaUrl?: string } = {}): LLMModule {
  const { modelId, apiKey, ollamaUrl } = options
  const ready = !!useHookstate(llm.engine).value
  const progress = useHookstate(llm.progress).value
  const initializing = useHookstate(llm.initializing).value
  const selectedModel = CODING_MODELS.find((m) => m.id === modelId)

  useEffect(() => {
    if (!selectedModel || selectedModel.provider !== 'mlc') return
    if (llm.initializing.value || llm.engine.value) return
    llm.initializing.set(true)
    initializeEngine(modelId)
      .then((llmInstance) => {
        llm.engine.set(llmInstance)
        llm.currentModelId.set(modelId || 'Llama-3.2-3B-Instruct-q4f32_1-MLC')
        llm.initializing.set(false)
      })
      .catch((error) => {
        console.error('Failed to initialize LLM:', error)
        llm.initializing.set(false)
      })
  }, [modelId])

  return {
    call: (options: LLMCallOptions) => {
      console.log('LLM call with options:', options)
      if (!selectedModel) throw new Error('No model selected')
      if (selectedModel.provider === 'mlc') {
        if (!llm.engine.value) throw new Error('LLM not initialized')
        return callMLC(llm.engine.value as MLCEngineInterface, options)
      } else {
        // For remote models, require apiKey or ollamaUrl as needed
        if (selectedModel.provider === 'ollama') {
          return callRemoteLLM(selectedModel, options, '', ollamaUrl)
        }
        if (!apiKey) throw new Error('API key required for remote LLM')
        return callRemoteLLM(selectedModel, options, apiKey, ollamaUrl)
      }
    },
    ready: selectedModel?.provider === 'mlc' ? ready : true,
    initializing: selectedModel?.provider === 'mlc' ? initializing : false,
    getModelInfo: () => ({
      modelId: llm.currentModelId.value || modelId || 'Llama-3.2-3B-Instruct-q4f32_1-MLC'
    }),
    progress
  }
}

export const callLLM = async (
  callOptions: LLMCallOptions,
  options: LLMInitOptions & { apiKey?: string; ollamaUrl?: string } = {}
) => {
  const { modelId } = options
  const selectedModel = CODING_MODELS.find((m) => m.id === modelId)

  if (!selectedModel) return

  /** @todo handle multiple promises */
  if (!llm.engine.value && selectedModel.provider === 'mlc') {
    const llmInstance = await initializeEngine()
    llm.engine.set(llmInstance)
    llm.currentModelId.set(modelId || 'Llama-3.2-3B-Instruct-q4f32_1-MLC')
    llm.initializing.set(false)
  }

  if (selectedModel.provider === 'mlc') {
    return callMLC(llm.engine.value as MLCEngineInterface, callOptions)
  }

  if (selectedModel.provider === 'ollama') {
    return callRemoteLLM(selectedModel, callOptions, '', options.ollamaUrl)
  }

  if (!options.apiKey) throw new Error('API key required for remote LLM')
  return callRemoteLLM(selectedModel, callOptions, options.apiKey, options.ollamaUrl)
}
