import React from 'react'
import { Tool } from '../registries/ToolRegistry'

export const ToolCard = ({ tool }: { tool: Tool }) => {
  return (
    <li key={tool.hash} className="flex flex-col rounded border bg-gray-50 p-3">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-gray-800">{tool.label}</span>
        <span className="text-xs text-gray-500">{tool.hash.slice(0, 8)}...</span>
      </div>
      <div className="text-xs text-gray-600">{tool.description}</div>
      <div className="mt-1 text-xs text-gray-400">
        Input hash: {tool.inputHash.slice(0, 8)}... | Output hash: {tool.outputHash.slice(0, 8)}...
      </div>
    </li>
  )
}
