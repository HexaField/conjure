import { useMutableState } from '@ir-engine/hyperflux'
import React from 'react'
import { SchemaCard } from '../components/SchemaCard'
import { SchemaRegistry, SchemaType } from '../registries/SchemaRegistry'

const SchemaView: React.FC = () => {
  const schemas = Object.values(useMutableState(SchemaRegistry).schemas.value) as SchemaType[]
  return (
    <div className="rounded-lg bg-white p-6 shadow-md">
      <h2 className="mb-4 text-xl font-semibold">Schemas</h2>
      <div className="mb-6">
        <h3 className="mb-2 font-medium">Available Schemas</h3>
        {schemas.length === 0 ? (
          <div className="text-sm text-gray-500">No schemas found.</div>
        ) : (
          <ul className="space-y-2">
            {schemas.map((schema) => (
              <SchemaCard key={schema.hash} schema={schema} />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export default SchemaView
