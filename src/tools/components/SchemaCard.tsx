import React from 'react'
import { SchemaType } from '../SchemaRegistry'
import { JsonDisplay } from './JsonDisplay'

export const SchemaCard = ({ schema }: { schema: SchemaType }) => {
  return (
    <li key={schema.hash} className="flex flex-col rounded border bg-gray-50 p-3">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-gray-800">{schema.label}</span>
        <span className="text-xs text-gray-500">{schema.hash.slice(0, 8)}...</span>
      </div>
      <div className="text-xs text-gray-600">{schema.description}</div>
      <JsonDisplay title="Schema" data={schema.schema} copyButtonText="Copy JSON" />
    </li>
  )
}
