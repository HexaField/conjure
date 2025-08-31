import { useCallback } from 'react'
import { GraphState } from '../state/graphState'
import { runGraph } from './runGraph'

export const useGraphActions = () => {
  const runAll = useCallback(() => {
    runGraph()
  }, [])

  const openExport = useCallback(() => {
    const graph = GraphState.serialize()
    const blob = new Blob([JSON.stringify(graph, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'Pipeline-graph.json'
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  return { runAll, openExport }
}
