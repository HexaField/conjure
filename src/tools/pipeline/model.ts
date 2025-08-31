export type PipelineStage =
  | {
      type: 'input'
      label?: string
      params?: { url?: string; schemaHash?: string; text?: string; format?: 'json' | 'csv'; data?: any }
      next: number[]
    }
  | {
      type: 'tool'
      label?: string
      toolHash: string
      params?: Record<string, any>
      next: number[]
    }
  | {
      type: 'output'
      label?: string
      params?: { outputType?: 'table' | 'json' | 'geojson' | 'chart'; outputHash?: string | null }
      next: number[]
    }

export type PipelineSpec = { stages: PipelineStage[] }
