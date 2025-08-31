import React, { useMemo, useState } from 'react'
import { PipelineEditor, PipelineGraph } from '../new/components/PipelineEditor'
import type { Pipeline } from '../registries/PipelineRegistry'

type ToolLite = { hash: string; label: string }

type Props = {
  pipeline: Pipeline
  tools: ToolLite[]
  onRun: () => void
  onSaveGraph: (graph: PipelineGraph, pipeline: Pipeline) => void
}

export const PipelineCard: React.FC<Props> = ({ pipeline, tools, onRun, onSaveGraph }) => {
  const [open, setOpen] = useState(false)
  const initialGraph = useMemo<PipelineGraph>(() => {
    return {
      nodes: [...(pipeline.graph?.nodes || [])],
      edges: [...(pipeline.graph?.edges || [])]
    }
  }, [pipeline.hash])
  const [working, setWorking] = useState<PipelineGraph>(initialGraph)

  const save = (g: PipelineGraph) => {
    onSaveGraph(g, pipeline)
  }

  return (
    <div className="rounded border px-2 py-2 text-sm">
      <div className="flex items-center justify-between">
        <div className="space-x-2">
          <span className="font-medium">{pipeline.label}</span>
          <span className="text-gray-500">{pipeline.hash.slice(0, 8)}</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="rounded bg-gray-100 px-2 py-1 hover:bg-gray-200" onClick={() => setOpen((v) => !v)}>
            {open ? 'Close' : 'Edit'}
          </button>
        </div>
      </div>
      {open && (
        <div className="mt-3">
          <PipelineEditor graph={working} onChange={setWorking} onRun={onRun} onSave={save} tools={tools} />
        </div>
      )}
    </div>
  )
}

export default PipelineCard
