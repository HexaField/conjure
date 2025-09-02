import { getState } from '@ir-engine/hyperflux'
import { TargetRegistry } from '../registries/TargetRegistry'
import { ToolRegistry } from '../registries/ToolRegistry'
import { PipelineSpec } from './model'

export async function runPipelineSpec(spec: PipelineSpec): Promise<void> {
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
        const outputHash = s.params?.outputHash
        if (!outputHash) return
        const targetGraph = getState(TargetRegistry)[outputHash]
        targetGraph.deserialize(stageData)
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
}
