import React from 'react'
import { useGraphStore } from '../../state/graphState'
import { useSelection } from '../../state/selectionState'

export const RightPane: React.FC = () => {
  const { selectedNodeId, nodeConfig, setNodeConfig, logs, clearLogs } = useSelection()
  const { updateNodeConfig } = useGraphStore()
  return (
    <aside className="overflow-auto rounded-xl bg-white p-2 shadow-[0_10px_20px_rgba(0,0,0,0.06)]">
      <div className="mb-2 flex items-center gap-2">
        <button className="rounded bg-blue-50 px-2 py-1 text-sm text-blue-700">Inspector</button>
        <button className="rounded px-2 py-1 text-sm hover:bg-gray-100">Logs</button>
      </div>
      <div className="space-y-3">
        <div>
          <h4 className="mb-1 font-semibold">Block Settings</h4>
          {selectedNodeId ? (
            // Fallback to raw JSON editing if no schema is provided; schema hookup can be added per node type
            <textarea
              className="h-40 w-full rounded border border-gray-200 p-2 text-xs"
              value={JSON.stringify(nodeConfig ?? {}, null, 2)}
              onChange={(e) => updateNodeConfig(selectedNodeId, JSON.parse(e.target.value || '{}'))}
            />
          ) : (
            <p className="text-sm text-gray-500">Select a node to edit settings</p>
          )}
        </div>
        <div>
          <h4 className="mb-1 font-semibold">Schema & Types</h4>
          {selectedNodeId ? (
            <pre className="max-h-40 overflow-auto rounded bg-gray-50 p-2 text-xs">
              {JSON.stringify(nodeConfig?.schema ?? {}, null, 2)}
            </pre>
          ) : null}
        </div>
      </div>
      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between">
          <span className="font-semibold">Logs</span>
          <button className="rounded px-2 py-1 text-sm hover:bg-gray-100" onClick={clearLogs}>
            Clear
          </button>
        </div>
        <pre className="max-h-40 overflow-auto rounded bg-gray-50 p-2 text-xs">{logs.join('\n')}</pre>
      </div>
    </aside>
  )
}
