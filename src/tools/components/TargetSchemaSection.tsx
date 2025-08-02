import React from 'react'
import { JSONSchemaType } from '../json-schema/JSONSchema'
import { TargetSchemas } from '../registries/TargetRegistry'
import { JsonDisplay } from './JsonDisplay'

interface TargetSchemaSectionProps {
  selectedTargetSchema: JSONSchemaType<any> | null
  onTargetSchemaChange: (schema: JSONSchemaType<any> | null) => void
  onTargetSchemaEdit: (schema: JSONSchemaType<any>) => void
}

export function TargetSchemaSection({
  selectedTargetSchema,
  onTargetSchemaChange,
  onTargetSchemaEdit
}: TargetSchemaSectionProps) {
  return (
    <div className="rounded-xl bg-white p-6 shadow-lg">
      <div className="mb-4">
        <label htmlFor="targetSchema" className="mb-2 block text-sm font-medium text-gray-700">
          Target Schema
        </label>
        <select
          id="targetSchema"
          value={selectedTargetSchema ? '0' : ''}
          onChange={(e) => {
            const index = parseInt(e.target.value)
            if (!isNaN(index) && TargetSchemas[index]) {
              onTargetSchemaChange(TargetSchemas[index])
            } else {
              onTargetSchemaChange(null)
            }
          }}
          className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Select a target schema...</option>
          {TargetSchemas.map((_, index) => (
            <option key={index} value={index}>
              Graph Schema (Nodes & Edges)
            </option>
          ))}
        </select>
      </div>

      {/* Display selected target schema */}
      {selectedTargetSchema && (
        <JsonDisplay
          title="Selected Target Schema"
          data={selectedTargetSchema}
          copyButtonText="Copy Schema"
          editable={true}
          onDataChange={onTargetSchemaEdit}
        />
      )}
    </div>
  )
}
