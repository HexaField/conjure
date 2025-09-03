import type { Edge, Node } from 'reactflow'
import type { PipelineSpec, PipelineStage } from './model'

export type DbNodeData = { type: string; config?: any }

export const graphToPipeline = (nodes: Node<DbNodeData>[], edges: Edge[]): PipelineSpec => {
  const idToIndex = new Map<string, number>()
  const stages: PipelineStage[] = nodes.map((n, idx) => {
    idToIndex.set(n.id, idx)
    const { type, config } = (n.data as DbNodeData) || { type: 'input', config: {} }
    if (type.startsWith('input')) {
      return { type: 'input', params: config, next: [] }
    }
    if (type.startsWith('xform') || type === 'tool') {
      return { type: 'tool', toolHash: (config as any)?.toolHash, params: config, next: [] }
    }
    return { type: 'output', params: config, next: [] }
  })
  edges.forEach((e) => {
    const s = idToIndex.get(e.source)
    const t = idToIndex.get(e.target)
    if (s == null || t == null) return
    stages[s].next.push(t)
  })
  return { stages }
}

export const pipelineToGraph = (pipeline: PipelineSpec) => {
  const nodes: Node<DbNodeData>[] = []
  const edges: Edge[] = []
  const xGap = 260
  const yGap = 140
  const incomingCounts = new Array(pipeline.stages.length).fill(0)
  pipeline.stages.forEach((s) => s.next.forEach((n) => (incomingCounts[n] += 1)))
  const startIndices = pipeline.stages.map((_, i) => i).filter((i) => incomingCounts[i] === 0)
  const visited = new Set<number>()
  const layer: number[] = [...startIndices]
  const layers: number[][] = []
  while (layer.length) {
    layers.push([...layer])
    const nextLayer: number[] = []
    for (const i of layer) {
      visited.add(i)
      for (const j of pipeline.stages[i].next) if (!visited.has(j)) nextLayer.push(j)
    }
    layer.length = 0
    nextLayer.forEach((n) => layer.push(n))
  }
  pipeline.stages.forEach((_, i) => {
    if (!visited.has(i)) layers.push([i])
  })
  const idxToId: string[] = []
  layers.forEach((list, yi) => {
    list.forEach((idx, xi) => {
      const s = pipeline.stages[idx]
      const id = `n_${idx}`
      idxToId[idx] = id
      const data: DbNodeData =
        s.type === 'input'
          ? { type: 'input.url', config: s.params || {} }
          : s.type === 'tool'
          ? { type: 'xform.js', config: { ...(s.params || {}), toolHash: (s as any).toolHash } }
          : { type: 'viz.table', config: s.params || {} }
      nodes.push({ id, type: 'db', data, position: { x: 80 + xi * xGap, y: 100 + yi * yGap } } as any)
    })
  })
  pipeline.stages.forEach((s, i) => s.next.forEach((t) => edges.push({ id: `e_${i}_${t}`, source: idxToId[i], target: idxToId[t] } as any)))
  return { nodes, edges }
}
