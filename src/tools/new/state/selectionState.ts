import { defineState, useMutableState } from '@ir-engine/hyperflux'

export const SelectionState = defineState({
  name: 'hexafield.conjure.new.Selection',
  initial: {
    selectedNodeId: null as string | null,
    nodeConfig: null as any,
    logs: [] as string[]
  }
})

export const useSelection = () => {
  const s = useMutableState(SelectionState)
  const setNodeConfig = (cfg: any) => s.value && s.merge({ nodeConfig: cfg })
  const clearLogs = () => s.value && s.merge({ logs: [] })
  return {
    selectedNodeId: s.value.selectedNodeId,
    nodeConfig: s.value.nodeConfig,
    logs: s.value.logs,
    setNodeConfig,
    clearLogs
  }
}
