import React, { useCallback, useMemo, useState } from 'react'
import { Rnd } from 'react-rnd'
import ReactFlow, {
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  Connection,
  Controls,
  Edge,
  EdgeChange,
  MiniMap,
  Node,
  NodeChange
} from 'reactflow'
import 'reactflow/dist/style.css'
import { EditorContext, ToolLite } from './EditorContext'
import { DbNode } from './Node'

export type PipelineGraph = { nodes: Node[]; edges: Edge[] }

type Props = {
  graph: PipelineGraph
  onChange: (graph: PipelineGraph) => void
  onRun: () => void
  onSave: (graph: PipelineGraph) => void
  tools?: ToolLite[]
}

export const PipelineEditor: React.FC<Props> = ({ graph, onChange, onRun, onSave, tools = [] }) => {
  const [showLeft, setShowLeft] = useState(true)
  const [showRight, setShowRight] = useState(true)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

  const nodeTypes = useMemo(() => ({ db: DbNode }), [])

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onChange({ nodes: applyNodeChanges(changes, graph.nodes), edges: graph.edges })
    },
    [graph.nodes, graph.edges, onChange]
  )
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      onChange({ nodes: graph.nodes, edges: applyEdgeChanges(changes, graph.edges) })
    },
    [graph.nodes, graph.edges, onChange]
  )
  const onConnect = useCallback(
    (connection: Connection) => {
      const id = `e_${crypto.randomUUID()}`
      onChange({ nodes: graph.nodes, edges: [...graph.edges, { id, ...connection } as any] })
    },
    [graph.nodes, graph.edges, onChange]
  )

  const updateNodeConfig = useCallback(
    (id: string, config: any) => {
      const nodes = graph.nodes.map((n) => (n.id === id ? { ...n, data: { ...(n.data || {}), config } } : n))
      onChange({ nodes, edges: graph.edges })
    },
    [graph.nodes, graph.edges, onChange]
  )

  return (
    <div className="relative h-[420px] w-full">
      <div className="absolute inset-0 overflow-hidden rounded-xl bg-white shadow">
        <EditorContext.Provider value={{ tools, updateNodeConfig }}>
          <ReactFlow
            nodes={graph.nodes}
            edges={graph.edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onSelectionChange={(sel) => setSelectedNodeId(sel.nodes[0]?.id ?? null)}
            nodeTypes={nodeTypes}
            fitView
          >
            <MiniMap />
            <Controls />
            <Background gap={8} />
          </ReactFlow>
        </EditorContext.Provider>
      </div>
      {showLeft && (
        <Rnd default={{ x: 8, y: 8, width: 300, height: 360 }} bounds="parent" className="pointer-events-auto">
          <div className="h-full w-full overflow-auto rounded-lg bg-white p-2 shadow">
            <div className="mb-2 flex items-center justify-between">
              <div className="font-semibold">Library</div>
              <button className="rounded px-2 py-1 text-sm hover:bg-gray-100" onClick={() => setShowLeft(false)}>
                Hide
              </button>
            </div>
            {/* Library list placeholder - controlled editor expects external library drag/drop wiring */}
            <div className="text-sm text-gray-500">Drag blocks from external library…</div>
          </div>
        </Rnd>
      )}
      {showRight && (
        <Rnd default={{ x: 520, y: 8, width: 340, height: 360 }} bounds="parent" className="pointer-events-auto">
          <div className="h-full w-full overflow-auto rounded-lg bg-white p-2 shadow">
            <div className="mb-2 flex items-center justify-between">
              <div className="font-semibold">Inspector</div>
              <button className="rounded px-2 py-1 text-sm hover:bg-gray-100" onClick={() => setShowRight(false)}>
                Hide
              </button>
            </div>
            <div className="text-sm text-gray-500">
              {selectedNodeId ? `Selected: ${selectedNodeId}` : 'Select a node to edit…'}
            </div>
          </div>
        </Rnd>
      )}
      <div className="pointer-events-auto absolute right-3 top-3 flex gap-2">
        <button className="rounded bg-emerald-600 px-3 py-1 text-white" onClick={onRun}>
          Run
        </button>
        <button className="rounded bg-gray-800 px-3 py-1 text-white" onClick={() => onSave(graph)}>
          Save
        </button>
      </div>
    </div>
  )
}
