import { getState } from '@ir-engine/hyperflux'
import React, { useCallback, useMemo, useRef, useState } from 'react'
import { Rnd } from 'react-rnd'
import ReactFlow, {
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  Connection,
  ConnectionMode,
  Controls,
  Edge,
  EdgeChange,
  MiniMap,
  Node,
  NodeChange,
  OnConnectEnd,
  OnConnectStart,
  ReactFlowProvider,
  useReactFlow
} from 'reactflow'
import 'reactflow/dist/style.css'
import { SchemaRegistry } from '../registries/SchemaRegistry'
import { ToolRegistry } from '../registries/ToolRegistry'
import { EditorContext, ToolLite } from './EditorContext'
import { DbNode } from './Node'

export type PipelineGraph = { nodes: Node[]; edges: Edge[] }

// Internal canvas component (defined at module scope to keep identity stable across renders)
type DnDFlowProps = {
  graph: PipelineGraph
  nodeTypes: Record<string, any>
  onNodesChange: (changes: NodeChange[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  onConnect: (connection: Connection) => void
  onSelected: (id: string | null) => void
  onAddToolNode: (position: { x: number; y: number }, toolHash: string) => void
  onOpenConnectMenu: (payload: {
    x: number
    y: number
    flowPos: { x: number; y: number }
    from: { nodeId: string; handleType: 'source' | 'target' }
  }) => void
  pendingConnectRef: React.MutableRefObject<{ nodeId: string; handleType: 'source' | 'target' } | null>
}

const DnDFlow: React.FC<DnDFlowProps> = ({
  graph,
  nodeTypes,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onSelected,
  onAddToolNode,
  onOpenConnectMenu,
  pendingConnectRef
}) => {
  const rf = useReactFlow()

  const onDragOver = useCallback((event: React.DragEvent) => {
    // Only indicate drop when dragging our reactflow payload
    const hasRF = Array.from(event.dataTransfer.types || []).includes('application/reactflow')
    if (!hasRF) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      const raw = event.dataTransfer.getData('application/reactflow')
      if (!raw) return
      let payload: any
      try {
        payload = JSON.parse(raw)
      } catch {
        return
      }
      const position = rf.screenToFlowPosition({ x: event.clientX, y: event.clientY })
      if (payload.kind === 'tool' && payload.hash) {
        onAddToolNode(position, payload.hash)
      }
    },
    [onAddToolNode, rf]
  )

  const onConnectStart = useCallback<OnConnectStart>((_, params) => {
    if (!params.nodeId || !params.handleType) return
    pendingConnectRef.current = { nodeId: params.nodeId, handleType: params.handleType }
  }, [])

  const onConnectEnd = useCallback<OnConnectEnd>(
    (event) => {
      const isPane = (event.target as HTMLElement)?.classList?.contains('react-flow__pane')
      if (!isPane || !pendingConnectRef.current) return
      const flowPos = rf.screenToFlowPosition({ x: (event as MouseEvent).clientX, y: (event as MouseEvent).clientY })
      onOpenConnectMenu({
        x: (event as MouseEvent).clientX,
        y: (event as MouseEvent).clientY,
        flowPos,
        from: pendingConnectRef.current
      })
      pendingConnectRef.current = null
    },
    [onOpenConnectMenu, rf]
  )

  return (
    <ReactFlow
      nodes={graph.nodes}
      edges={graph.edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onSelectionChange={(sel) => onSelected(sel.nodes[0]?.id ?? null)}
      nodeTypes={nodeTypes}
      fitView
      onDrop={onDrop}
      onDragOver={onDragOver}
      onConnectStart={onConnectStart}
      onConnectEnd={onConnectEnd}
      connectionMode={ConnectionMode.Loose}
    >
      <MiniMap />
      <Controls />
      <Background gap={8} />
    </ReactFlow>
  )
}

type Props = {
  graph: PipelineGraph
  onChange: (graph: PipelineGraph) => void
  onRun: () => void
  onSave: (graph: PipelineGraph) => void
  tools?: ToolLite[]
  nodeOutputs?: Record<string, any>
}

export const PipelineEditor: React.FC<Props> = ({ graph, onChange, onRun, onSave, tools = [], nodeOutputs }) => {
  const [showLeft, setShowLeft] = useState(true)
  const [showRight, setShowRight] = useState(true)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [connectMenu, setConnectMenu] = useState<{
    x: number
    y: number
    flowPos: { x: number; y: number }
    from: { nodeId: string; handleType: 'source' | 'target' }
  } | null>(null)
  const pendingConnectRef = useRef<{ nodeId: string; handleType: 'source' | 'target' } | null>(null)

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

  // helper to add tool node at position
  const addToolNodeAt = useCallback(
    (position: { x: number; y: number }, hash: string) => {
      const id = `n_${crypto.randomUUID()}`
      const newNode: Node = {
        id,
        type: 'db',
        position,
        data: { type: 'tool', config: { toolHash: hash } }
      } as any
      onChange({ nodes: [...graph.nodes, newNode], edges: graph.edges })
      setSelectedNodeId(id)
    },
    [graph.nodes, graph.edges, onChange]
  )

  // Helper to create node and edge from connect menu action
  const createNodeFromMenu = useCallback(
    (kind: 'tool' | 'input' | 'output', toolHash?: string) => {
      const menu = connectMenu
      if (!menu) return
      const id = `n_${crypto.randomUUID()}`
      let data: any
      if (kind === 'tool') data = { type: 'tool', config: { toolHash: toolHash || '' } }
      else if (kind === 'input') data = { type: 'input.url', config: { url: '', schemaHash: '' } }
      else data = { type: 'viz.table', config: { outputType: 'table' } }

      const newNode: Node = { id, type: 'db', position: menu.flowPos, data } as any

      // Wire the edge depending on starting handle
      const from = menu.from as { nodeId: string; handleType: 'source' | 'target' }
      const edge: Edge =
        from.handleType === 'source'
          ? ({ id: `e_${crypto.randomUUID()}`, source: from.nodeId, target: id } as any)
          : ({ id: `e_${crypto.randomUUID()}`, source: id, target: from.nodeId } as any)

      onChange({ nodes: [...graph.nodes, newNode], edges: [...graph.edges, edge] })
      setSelectedNodeId(id)
      setConnectMenu(null)
    },
    [connectMenu, graph.nodes, graph.edges, onChange]
  )

  return (
    <div className="relative h-[420px] w-full">
      <div className="absolute inset-0 overflow-hidden rounded-xl bg-white shadow">
        <EditorContext.Provider value={{ tools, updateNodeConfig }}>
          <ReactFlowProvider>
            <DnDFlow
              graph={graph}
              nodeTypes={nodeTypes}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onSelected={setSelectedNodeId}
              onAddToolNode={addToolNodeAt}
              onOpenConnectMenu={(p) => setConnectMenu(p)}
              pendingConnectRef={pendingConnectRef}
            />
          </ReactFlowProvider>
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

            {tools.length === 0 && <div className="text-sm text-gray-500">No tools available</div>}
            <div className="mt-2">
              {tools.map((tool) => (
                <div
                  key={tool.hash}
                  className="mb-1 cursor-grab rounded px-2 py-1 hover:bg-gray-50 active:cursor-grabbing"
                  draggable
                  onDragStart={(e) =>
                    e.dataTransfer.setData('application/reactflow', JSON.stringify({ kind: 'tool', hash: tool.hash }))
                  }
                  title="Drag onto canvas"
                >
                  <span className="font-medium">{tool.label}</span>
                  <span className="text-gray-500"> ({tool.hash.slice(0, 8)})</span>
                </div>
              ))}
            </div>
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
            {selectedNodeId ? (
              <Inspector node={graph.nodes.find((n) => n.id === selectedNodeId) || null} outputs={nodeOutputs} />
            ) : (
              <div className="text-sm text-gray-500">Select a node to edit…</div>
            )}
          </div>
        </Rnd>
      )}

      {connectMenu && (
        <div className="pointer-events-auto absolute z-50" style={{ left: connectMenu.x, top: connectMenu.y }}>
          <div className="w-64 rounded-md border bg-white p-2 shadow-xl">
            <div className="mb-2 text-sm font-semibold">Add node</div>
            <div className="space-y-2">
              {connectMenu.from.handleType === 'target' && (
                <button
                  className="w-full rounded bg-gray-100 px-2 py-1 text-left text-sm hover:bg-gray-200"
                  onClick={() => createNodeFromMenu('input')}
                >
                  Input
                </button>
              )}
              {connectMenu.from.handleType === 'source' && (
                <button
                  className="w-full rounded bg-gray-100 px-2 py-1 text-left text-sm hover:bg-gray-200"
                  onClick={() => createNodeFromMenu('output')}
                >
                  Output
                </button>
              )}
              <div className="border-t pt-2">
                <label className="mb-1 block text-xs text-gray-600">Tool</label>
                <div className="flex items-center gap-2">
                  <select id="tool-select" className="flex-1 rounded border px-2 py-1 text-sm">
                    <option value="">Select tool…</option>
                    {tools.map((t) => (
                      <option key={t.hash} value={t.hash}>
                        {t.label} ({t.hash.slice(0, 8)})
                      </option>
                    ))}
                  </select>
                  <button
                    className="rounded bg-blue-600 px-2 py-1 text-xs text-white"
                    onClick={() => {
                      const sel = (document.getElementById('tool-select') as HTMLSelectElement)?.value
                      if (sel) createNodeFromMenu('tool', sel)
                    }}
                  >
                    Add
                  </button>
                </div>
              </div>
              <div className="text-right">
                <button className="mt-1 text-xs text-gray-600" onClick={() => setConnectMenu(null)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
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

// Inspector component for right panel
const Inspector: React.FC<{ node: Node | null; outputs?: Record<string, any> }> = ({ node, outputs }) => {
  if (!node) return null
  const data: any = node.data || {}
  const type = data.type as string

  if (type === 'tool' || (typeof type === 'string' && type.startsWith('xform'))) {
    const toolHash = data?.config?.toolHash
    const tool = toolHash ? getState(ToolRegistry).tools[toolHash] : null
    return (
      <div className="space-y-2 text-sm">
        <div className="font-medium">Tool</div>
        <div>
          <div className="text-gray-600">Hash</div>
          <div className="font-mono text-xs">{toolHash || '—'}</div>
        </div>
        {tool ? (
          <>
            <div>
              <div className="text-gray-600">Label</div>
              <div>{tool.label}</div>
            </div>
            <div>
              <div className="text-gray-600">Input schema</div>
              <div className="whitespace-pre-wrap break-all rounded bg-gray-50 p-2 font-mono text-[11px]">
                {JSON.stringify(tool.input, null, 2)}
              </div>
            </div>
            <div>
              <div className="text-gray-600">Output schema</div>
              <div className="whitespace-pre-wrap break-all rounded bg-gray-50 p-2 font-mono text-[11px]">
                {JSON.stringify(tool.output, null, 2)}
              </div>
            </div>
            <div>
              <div className="text-gray-600">Transformer</div>
              {typeof tool.transformation === 'string' ? (
                <pre className="max-h-40 overflow-auto rounded bg-gray-900 p-2 text-[11px] text-green-200">
                  {tool.transformation}
                </pre>
              ) : (
                <div className="whitespace-pre-wrap break-all rounded bg-gray-50 p-2 font-mono text-[11px]">
                  {JSON.stringify(tool.transformation, null, 2)}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="text-gray-500">Select a tool for this node.</div>
        )}
      </div>
    )
  }

  if (typeof type === 'string' && type.startsWith('input')) {
    const url = data?.config?.url || '—'
    const schemaHash = data?.config?.schemaHash || ''
    const schema = schemaHash ? getState(SchemaRegistry).schemas[schemaHash] : null
    return (
      <div className="space-y-2 text-sm">
        <div className="font-medium">Input</div>
        <div>
          <div className="text-gray-600">URL</div>
          <div className="break-all font-mono text-xs">{url}</div>
        </div>
        <div>
          <div className="text-gray-600">Schema</div>
          {schema ? (
            <div className="whitespace-pre-wrap break-all rounded bg-gray-50 p-2 font-mono text-[11px]">
              {JSON.stringify(schema.schema, null, 2)}
            </div>
          ) : (
            <div className="text-gray-500">No schema</div>
          )}
        </div>
      </div>
    )
  }

  // Output / Viz node
  if (typeof type === 'string' && (type.startsWith('viz') || type.startsWith('output'))) {
    const outputHash = data?.config?.outputHash
    const schema = outputHash ? getState(SchemaRegistry).schemas[outputHash] : null
    const current = outputs?.[node.id]
    return (
      <div className="space-y-2 text-sm">
        <div className="font-medium">Output</div>
        <div>
          <div className="text-gray-600">Schema</div>
          {schema ? (
            <div className="whitespace-pre-wrap break-all rounded bg-gray-50 p-2 font-mono text-[11px]">
              {JSON.stringify(schema.schema, null, 2)}
            </div>
          ) : (
            <div className="text-gray-500">No schema</div>
          )}
        </div>
        <div>
          <div className="text-gray-600">Current data</div>
          {current ? (
            <div className="max-h-40 overflow-auto whitespace-pre-wrap break-all rounded bg-gray-50 p-2 font-mono text-[11px]">
              {JSON.stringify(current, null, 2)}
            </div>
          ) : (
            <div className="text-gray-500">No data available.</div>
          )}
        </div>
      </div>
    )
  }

  return <div className="text-sm text-gray-500">No inspector available.</div>
}
