import React from 'react'
import { useOutput } from '../../state/outputState'

export const BottomPanel: React.FC = () => {
  const { datatype, data, exportAs } = useOutput()
  return (
    <footer className="sticky bottom-0 bg-white p-1 shadow-[0_10px_20px_rgba(0,0,0,0.06)]">
      <div className="flex items-center gap-2 p-1">
        <span className="font-medium">Output</span>
        <div className="flex-1" />
        <button className="rounded px-2 py-1 text-sm hover:bg-gray-100" onClick={() => exportAs('csv')}>
          CSV
        </button>
        <button className="rounded px-2 py-1 text-sm hover:bg-gray-100" onClick={() => exportAs('json')}>
          JSON
        </button>
        <button className="rounded px-2 py-1 text-sm hover:bg-gray-100" onClick={() => exportAs('geojson')}>
          GeoJSON
        </button>
      </div>
      <div className="max-h-72 overflow-auto">
        {datatype === 'table' && <pre className="rounded bg-gray-50 p-2 text-xs">{JSON.stringify(data, null, 2)}</pre>}
        {datatype === 'json' && <pre className="rounded bg-gray-50 p-2 text-xs">{JSON.stringify(data, null, 2)}</pre>}
        {datatype === 'geojson' && (
          <pre className="rounded bg-gray-50 p-2 text-xs">{JSON.stringify(data, null, 2)}</pre>
        )}
        {datatype === 'chart' && <pre className="rounded bg-gray-50 p-2 text-xs">{JSON.stringify(data, null, 2)}</pre>}
      </div>
    </footer>
  )
}
