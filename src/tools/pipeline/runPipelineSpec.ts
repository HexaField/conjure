import { PipelineSpec } from './model'
import { ToolRegistry } from '../registries/ToolRegistry'

export type PipelineSpecRunResult = {
  stageData: Record<number, any>
  outputs: Array<{ index: number; data: any }>
}

export async function runPipelineSpec(spec: PipelineSpec): Promise<PipelineSpecRunResult> {
  const { stages } = spec
  const incoming: Record<number, number[]> = {}
  const outgoing: Record<number, number[]> = {}
  stages.forEach((_, i) => {
    incoming[i] = []
    outgoing[i] = []
  })
  stages.forEach((s, i) => s.next.forEach((t) => outgoing[i].push(t)))
  stages.forEach((_, t) => stages.forEach((s, i) => s.next.includes(t) && incoming[t].push(i)))

  const evaluated = new Set<number>()
  const stageData: Record<number, any> = {}

  const evalStage = async (i: number) => {
    const s = stages[i]
    const ins = (incoming[i] || []).map((sid) => stageData[sid]).filter((v) => v !== undefined)
    try {
      if (s.type === 'input') {
        if (s.params?.data !== undefined) stageData[i] = s.params.data
        else if (s.params?.text) {
          if (s.params.format === 'csv') {
            const [head, ...rows] = s.params.text.trim().split(/\r?\n/)
            const headers = head.split(',')
            stageData[i] = rows.map((r: string) => {
              const vals = r.split(',')
              return Object.fromEntries(headers.map((h, idx) => [h, vals[idx]]))
            })
          } else {
            stageData[i] = JSON.parse(s.params.text)
          }
        } else {
          stageData[i] = null
        }
      } else if (s.type === 'tool') {
        const toolHash = s.toolHash
        const input = ins[0]
        stageData[i] = toolHash ? await ToolRegistry.run(toolHash as any, input) : input
      } else if (s.type === 'output') {
        stageData[i] = ins[0]
      }
    } catch (e) {
      console.error('Pipeline stage failed', i, e)
      stageData[i] = undefined
    }
    evaluated.add(i)
  }

  for (let pass = 0; pass < stages.length; pass++) {
    for (let i = 0; i < stages.length; i++) {
      if (evaluated.has(i)) continue
      const inc = incoming[i] || []
      if (inc.length === 0 || inc.every((sid) => evaluated.has(sid))) {
        // eslint-disable-next-line no-await-in-loop
        await evalStage(i)
      }
    }
  }

  const outputs = stages
    .map((s, i) => (s.type === 'output' ? { index: i, data: stageData[i] } : null))
    .filter(Boolean) as Array<{ index: number; data: any }>
  return { stageData, outputs }
}
