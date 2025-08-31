import React, { useCallback } from 'react'
import ReactFlow, { Background, Controls, MiniMap, type Connection, type Edge, type Node } from 'reactflow'
import 'reactflow/dist/style.css'
import { useGraphStore } from '../../state/graphState'
import { DbNode } from './Node'

export const GraphWorkbench: React.FC = () => {
  const { nodes, edges, onNodesChange, onEdgesChange, setSelection, addNodeFromLibrary, createEdge, removeSelection } =
    useGraphStore()

  const onConnect = useCallback(
    (connection: Connection) => {
      createEdge(connection)
    },
    [createEdge]
  )

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      const payload = event.dataTransfer.getData('application/x-Pipeline')
      if (!payload) return
      const detail = JSON.parse(payload)
      addNodeFromLibrary(detail, { x: event.clientX, y: event.clientY })
    },
    [addNodeFromLibrary]
  )

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
  }, [])

  const onSelectionChange = useCallback((params: { nodes: Node[]; edges: Edge[] }) => {
    setSelection({ nodes: params.nodes, edges: params.edges })
  }, [])

  return (
    <div className="h-full" onDrop={onDrop} onDragOver={onDragOver}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onSelectionChange={onSelectionChange}
        fitView
        nodeTypes={{ db: DbNode }}
      >
        <MiniMap />
        <Controls />
        <Background gap={8} />
      </ReactFlow>
    </div>
  )
}
