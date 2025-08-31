import React from 'react'
import type { JSONSchemaType } from '../../../json-schema/JSONSchema'

type Props<T = any> = {
  schema: JSONSchemaType<T>
  value: any
  onChange: (val: any) => void
}

export function SchemaForm<T = any>({ schema, value, onChange }: Props<T>) {
  if (!schema || schema.type !== 'object' || !schema.properties) return null
  const props = schema.properties as Record<string, any>

  const set = (key: string, v: any) => {
    onChange({ ...(value as any), [key]: v })
  }

  return (
    <div className="space-y-2">
      {Object.entries(props).map(([key, prop]) => {
        const title = prop.title || key
        const req = (schema.required as string[] | undefined)?.includes(key)
        if (prop.enum) {
          return (
            <label key={key} className="block text-sm">
              <span className="mb-0.5 block text-gray-600">{title}</span>
              <select
                className="w-full rounded border border-gray-200 px-2 py-1 text-sm"
                value={(value as any)?.[key] ?? ''}
                onChange={(e) => set(key, e.target.value)}
              >
                <option value="" disabled={req}>
                  {req ? 'Select…' : '—'}
                </option>
                {prop.enum.map((opt: any) => (
                  <option key={String(opt)} value={opt}>
                    {String(opt)}
                  </option>
                ))}
              </select>
            </label>
          )
        }
        switch (prop.type) {
          case 'string':
            return (
              <label key={key} className="block text-sm">
                <span className="mb-0.5 block text-gray-600">{title}</span>
                <input
                  className="w-full rounded border border-gray-200 px-2 py-1 text-sm"
                  value={(value as any)?.[key] ?? ''}
                  onChange={(e) => set(key, e.target.value)}
                />
              </label>
            )
          case 'number':
          case 'integer':
            return (
              <label key={key} className="block text-sm">
                <span className="mb-0.5 block text-gray-600">{title}</span>
                <input
                  type="number"
                  className="w-full rounded border border-gray-200 px-2 py-1 text-sm"
                  value={(value as any)?.[key] ?? ''}
                  onChange={(e) => set(key, Number(e.target.value))}
                />
              </label>
            )
          case 'boolean':
            return (
              <label key={key} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={Boolean((value as any)?.[key])}
                  onChange={(e) => set(key, e.target.checked)}
                />
                <span>{title}</span>
              </label>
            )
          default:
            return null
        }
      })}
    </div>
  )
}
