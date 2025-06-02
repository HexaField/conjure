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
}

/**
 * Available coding models for selection
 */
export interface CodingModel {
  id: string
  name: string
  description: string
  size: string
  parameters: string
}

/**
 * Configuration options for initializing the LLM
 */
export interface LLMInitOptions {
  /** Model ID to load (defaults to Llama-3.2-3B-Instruct-q4f32_1-MLC) */
  modelId?: string
  /** Custom progress callback for model loading */
  onProgress?: (progress: { text: string; progress?: number }) => void
}

/**
 * Available coding models optimized for code generation
 */
export const CODING_MODELS: CodingModel[] = [
  {
    id: 'Qwen2.5-Coder-1.5B-Instruct-q4f32_1-MLC',
    name: 'Qwen2.5 Coder 1.5B',
    description: 'Fast and efficient coding model for quick tasks',
    size: 'Small',
    parameters: '1.5B'
  },
  {
    id: 'Qwen2.5-Coder-7B-Instruct-q4f32_1-MLC',
    name: 'Qwen2.5 Coder 7B',
    description: 'Balanced performance and speed for most coding tasks',
    size: 'Medium',
    parameters: '7B'
  },
  {
    id: 'Hermes-3-Llama-3.1-8B-q4f32_1-MLC',
    name: 'Hermes 3 Llama 8B',
    description: 'Excellent instruction following and code reasoning',
    size: 'Medium-Large',
    parameters: '8B'
  },
  {
    id: 'Qwen2.5-Coder-14B-Instruct-q4f32_1-MLC',
    name: 'Qwen2.5 Coder 14B',
    description: 'High-quality code generation for complex tasks',
    size: 'Large',
    parameters: '14B'
  },
  {
    id: 'DeepSeek-R1-Distill-Qwen-7B-q4f32_1-MLC',
    name: 'DeepSeek R1 Distill 7B',
    description: 'Advanced reasoning capabilities for complex coding problems',
    size: 'Medium',
    parameters: '7B'
  }
]

/**
 * Initialize the LLM engine with a specific model
 */
async function initializeEngine(
  modelId: string = 'Llama-3.2-3B-Instruct-q4f32_1-MLC',
  onProgress?: (progress: { text: string; progress?: number }) => void
): Promise<MLCEngineInterface> {
  try {
    console.log(`Initializing LLM engine with model: ${modelId}`)
    return await CreateMLCEngine(modelId, {
      initProgressCallback: (report) => {
        console.log(`Loading progress: ${report.text}`)
        onProgress?.(report)
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
async function callLLM<T = unknown>(engine: MLCEngineInterface, options: LLMCallOptions): Promise<LLMResponse<T>> {
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

const llm = hookstate({
  engine: null as null | MLCEngineInterface,
  initializing: false,
  currentModelId: null as string | null
})

/**
 * Reload the LLM with a new model
 */
export async function reloadLLM(
  modelId: string,
  onProgress?: (progress: { text: string; progress?: number }) => void
): Promise<void> {
  if (llm.initializing.value) {
    throw new Error('LLM is already initializing')
  }

  llm.initializing.set(true)
  llm.engine.set(null)

  try {
    const newEngine = await initializeEngine(modelId, onProgress)
    llm.engine.set(newEngine)
    llm.currentModelId.set(modelId)
  } finally {
    llm.initializing.set(false)
  }
}

/**
 * Main initialization function that returns the LLM module interface
 */
export function useLLM(options: LLMInitOptions = {}): LLMModule {
  const { modelId, onProgress } = options

  const ready = !!useHookstate(llm.engine).value
  const initializing = useHookstate(llm.initializing).value

  useEffect(() => {
    if (llm.initializing.value || llm.engine.value) return
    llm.initializing.set(true)
    initializeEngine(modelId, onProgress)
      .then((llmInstance) => {
        llm.engine.set(llmInstance)
        llm.currentModelId.set(modelId || 'Llama-3.2-3B-Instruct-q4f32_1-MLC')
        llm.initializing.set(false)
      })
      .catch((error) => {
        console.error('Failed to initialize LLM:', error)
        llm.initializing.set(false)
      })
  }, [modelId, onProgress])

  return {
    call: (options: LLMCallOptions) => {
      if (!llm.engine.value) throw new Error('LLM not initialized')
      return callLLM(llm.engine.value as MLCEngineInterface, options)
    },
    ready,
    initializing,
    getModelInfo: () => ({
      modelId: llm.currentModelId.value || modelId || 'Llama-3.2-3B-Instruct-q4f32_1-MLC'
    })
  }
}
