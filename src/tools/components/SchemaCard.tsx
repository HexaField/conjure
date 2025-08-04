import React from 'react'
import { SchemaType } from '../registries/SchemaRegistry'
import { JsonDisplay } from './JsonDisplay'

export const SchemaCard = ({ schema, onForget }: { schema: SchemaType; onForget?: (hash: string) => void }) => {
  return (
    <li key={schema.hash} className="flex flex-col rounded border bg-gray-50 p-3">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-gray-800">{schema.label}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">{schema.hash.slice(0, 8)}...</span>
          {onForget && (
            <button
              onClick={() => onForget(schema.hash)}
              className="rounded bg-gray-500 px-2 py-1 text-xs text-white hover:bg-red-600"
              title="Remove schema"
            >
              Forget
            </button>
          )}
        </div>
      </div>
      <div className="text-xs text-gray-600">{schema.description}</div>
      <JsonDisplay title="Schema" data={schema.schema} copyButtonText="Copy JSON" />
    </li>
  )
}
