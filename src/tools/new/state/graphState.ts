import { defineState, getMutableState, NO_PROXY, useMutableState } from '@ir-engine/hyperflux'
import {
  applyEdgeChanges,
  applyNodeChanges,
  Connection,
  Edge,
  EdgeChange,
  Node,
  NodeChange,
  XYPosition
} from 'reactflow'
import { SelectionState } from './selectionState'

export type GraphNodeData = {
  type: string
  config?: any
}

export const GraphState = defineState({
  name: 'hexafield.conjure.new.Graph',
  initial: {
    nodes: [] as Node<GraphNodeData>[],
    edges: [] as Edge[],
    results: {} as Record<string, any>
  },
  serialize: () => {
    const state = getMutableState(GraphState)
    return {
      nodes: state.nodes.value,
      edges: state.edges.value
    }
  },
  deserialize: (payload: { nodes: Node<GraphNodeData>[]; edges: Edge[] }) => {
    const s = getMutableState(GraphState)
    s.nodes.set(payload.nodes)
    s.edges.set(payload.edges)
  }
})

export const useGraphStore = () => {
  const s = useMutableState(GraphState)

  const addNodeFromLibrary = (detail: { type: string; config?: any }, pos: XYPosition) => {
    const id = `n_${crypto.randomUUID()}`
    s.nodes.merge([
      {
        id,
        type: 'db',
        data: { type: detail.type, config: detail.config },
        position: pos
      }
    ])
  }

  const createEdge = (connection: Connection) => {
    const id = `e_${crypto.randomUUID()}`
    s.edges.merge([
      {
        id,
        source: connection.source!,
        sourceHandle: connection.sourceHandle,
        target: connection.target!,
        targetHandle: connection.targetHandle
      }
    ])
  }

  const onNodesChange = (changes: NodeChange[]) => {
    s.nodes.set((prev) => applyNodeChanges(changes, prev))
  }

  const onEdgesChange = (changes: EdgeChange[]) => {
    s.edges.set((prev) => applyEdgeChanges(changes, prev))
  }

  const setSelection = (selection: { nodes: Node[]; edges: Edge[] }) => {
    const first = selection.nodes[0]
    getMutableState(SelectionState).merge({ selectedNodeId: first?.id ?? null })
  }

  const removeSelection = () => {
    const selectedIds = new Set(s.nodes.value.filter((n) => n.selected).map((n) => n.id))
    s.nodes.set((prev) => prev.filter((n) => !selectedIds.has(n.id)))
    s.edges.set((prev) => prev.filter((e) => !selectedIds.has(e.source) && !selectedIds.has(e.target)))
  }

  const nodes = s.nodes.get(NO_PROXY) as unknown as Node<GraphNodeData>[]
  const edges = s.edges.get(NO_PROXY) as unknown as Edge[]

  return {
    nodes,
    edges,
    results: s.results.get(NO_PROXY) as Record<string, any>,
    onNodesChange,
    onEdgesChange,
    setSelection,
    addNodeFromLibrary,
    createEdge,
    removeSelection,
    updateNodeConfig: (id: string, config: any) => {
      s.nodes.set((prev) => prev.map((n) => (n.id === id ? { ...n, data: { ...n.data, config } } : n)))
    },
    setResult: (id: string, value: any) => {
      s.results.merge({ [id]: value })
    }
  }
}
