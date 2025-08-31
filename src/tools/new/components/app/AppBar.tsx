import React from 'react'
import { useGraphActions } from '../../logic/useGraphActions'

export const AppBar: React.FC = () => {
  const { runAll, openExport } = useGraphActions()
  return (
    <div className="flex items-center justify-between bg-white px-4 py-2 shadow-[0_10px_20px_rgba(0,0,0,0.06)]">
      <div className="flex items-center gap-4">
        <span className="font-semibold tracking-wide">Pipeline</span>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <button className="rounded px-2 py-1 hover:bg-gray-100">File</button>
          <button className="rounded px-2 py-1 hover:bg-gray-100">View</button>
          <button className="rounded px-2 py-1 hover:bg-gray-100">Help</button>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          className="rounded bg-[#1EA07A] px-3 py-1 text-white shadow hover:bg-emerald-600"
          onClick={runAll}
          title="Run"
        >
          ▶
        </button>
        <div className="mx-1 h-5 w-px bg-gray-200" />
        <button className="rounded px-3 py-1 hover:bg-gray-100" onClick={() => openExport()}>
          Export
        </button>
        <div className="h-7 w-7 rounded-full bg-gray-200" />
      </div>
    </div>
  )
}
