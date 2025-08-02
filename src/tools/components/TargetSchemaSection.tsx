import { getState } from '@ir-engine/hyperflux'
import React from 'react'
import { JSONSchemaType } from '../json-schema/JSONSchema'
import { TargetRegistry } from '../registries/TargetRegistry'
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
            if (!isNaN(index) && getState(TargetRegistry)[index]) {
              onTargetSchemaChange(getState(TargetRegistry)[index].value)
            } else {
              onTargetSchemaChange(null)
            }
          }}
          className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Select a target schema...</option>
          {Object.values(getState(TargetRegistry)).map((schema, index) => (
            <option key={index} value={index}>
              {schema.label}
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
