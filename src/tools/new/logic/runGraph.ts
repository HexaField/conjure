import { getState, getMutableState } from '@ir-engine/hyperflux'
import { GraphState } from '../state/graphState'
import { ToolRegistry } from '../../registries/ToolRegistry'
import { OutputState } from '../state/outputState'

const isTransform = (type?: string) => type?.startsWith('xform.')
const isInput = (type?: string) => type?.startsWith('input.')
const isViz = (type?: string) => type?.startsWith('viz.')

export async function runGraph() {
  const { nodes, edges } = getState(GraphState)
  const incoming: Record<string, string[]> = {}
  const outgoing: Record<string, string[]> = {}
  nodes.forEach((n) => {
    incoming[n.id] = []
    outgoing[n.id] = []
  })
  edges.forEach((e) => {
    if (!incoming[e.target]) incoming[e.target] = []
    if (!outgoing[e.source]) outgoing[e.source] = []
    incoming[e.target].push(e.source)
    outgoing[e.source].push(e.target)
  })

  const evaluated = new Set<string>()
  const results: Record<string, any> = {}

  const evaluateNode = async (id: string) => {
    const node = nodes.find((n) => n.id === id)
    if (!node) return
    const t = node.data?.type as string | undefined
    const cfg = node.data?.config
    const inputs = (incoming[id] || []).map((sid) => results[sid]).filter((v) => v !== undefined)
    try {
      if (isInput(t)) {
        if (t === 'input.paste') {
          const txt = cfg?.text || ''
          const fmt = cfg?.format || 'json'
          if (fmt === 'json') {
            results[id] = JSON.parse(txt)
          } else {
            // minimal CSV: split lines, first row headers
            const [head, ...rows] = txt.trim().split(/\r?\n/)
            const headers = head.split(',')
            results[id] = rows.map((r) => {
              const vals = r.split(',')
              return Object.fromEntries(headers.map((h, i) => [h, vals[i]]))
            })
          }
        }
      } else if (isTransform(t)) {
        const toolHash = cfg?.toolHash as string | undefined
        if (toolHash && inputs.length) {
          results[id] = await ToolRegistry.run(toolHash as any, inputs[0])
        } else {
          results[id] = inputs[0]
        }
      } else if (isViz(t)) {
        // pass-through, renderer will decide
        results[id] = inputs[0]
      } else {
        results[id] = inputs[0]
      }
    } catch (e) {
      console.error('Node run failed', id, e)
      results[id] = undefined
    }
    evaluated.add(id)
  }

  // simple iterative evaluation up to N passes
  for (let pass = 0; pass < nodes.length; pass++) {
    for (const n of nodes) {
      if (evaluated.has(n.id)) continue
      const inc = incoming[n.id] || []
      if (inc.length === 0 || inc.every((sid) => evaluated.has(sid))) {
        // eslint-disable-next-line no-await-in-loop
        await evaluateNode(n.id)
      }
    }
  }

  // save results
  const gs = getMutableState(GraphState)
  gs.results.set(results)

  // choose a final output: pick any viz node if present else last evaluated
  const viz = nodes.find((n) => isViz(n.data?.type))
  const finalId = viz?.id || nodes[nodes.length - 1]?.id
  const data = finalId ? results[finalId] : undefined

  let datatype: 'json' | 'table' | 'geojson' | 'chart' = 'json'
  if (viz?.data?.type === 'viz.table') datatype = 'table'

  getMutableState(OutputState).merge({ datatype, data })
}
