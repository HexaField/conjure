import React from 'react'
import { Tool } from '../registries/ToolRegistry'
import { JsonDisplay } from './JsonDisplay'

interface ToolCardProps {
  tool: Tool
  onUse?: (tool: Tool) => void
  onForget?: (hash: string) => void
}

export const ToolCard = ({ tool, onUse, onForget }: ToolCardProps) => {
  return (
    <li key={tool.hash} className="flex flex-col rounded border bg-gray-50 p-3">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-gray-800">{tool.label}</span>
        <span className="text-xs text-gray-500">{tool.hash.slice(0, 8)}...</span>
        {onForget && (
          <button
            onClick={() => onForget(tool.hash)}
            className="rounded bg-gray-500 px-2 py-1 text-xs text-white hover:bg-red-600"
            title="Remove tool"
          >
            Forget
          </button>
        )}
      </div>
      <div className="text-xs text-gray-600">{tool.description}</div>
      <JsonDisplay
        title="Transform Function"
        data={tool.transformation}
        format={typeof tool.transformation === 'string' ? 'javascript' : 'json'}
        copyButtonText="Copy Function"
      />
      <div className="mt-1 text-xs text-gray-400">
        Input hash: {tool.inputHash.slice(0, 8)}... | Output hash: {tool.outputHash.slice(0, 8)}... | Transformer hash:{' '}
        {tool.transformationHash.slice(0, 8)}...
      </div>
      {onUse && (
        <button
          className="mt-2 rounded bg-green-600 px-3 py-1 text-sm font-semibold text-white hover:bg-green-700"
          onClick={() => onUse(tool)}
        >
          Use Tool
        </button>
      )}
    </li>
  )
}
