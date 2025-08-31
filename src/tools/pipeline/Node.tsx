import React, { useContext, useMemo } from 'react'
import { Handle, NodeProps, Position } from 'reactflow'
import type { JSONSchemaType } from '../json-schema/JSONSchema'
import { EditorContext } from './EditorContext'
import { SchemaForm } from './SchemaForm'

const inputPasteSchema: JSONSchemaType<{ text: string; format: 'json' | 'csv' }> = {
  type: 'object',
  properties: {
    text: { type: 'string', title: 'Data' },
    format: { type: 'string', enum: ['json', 'csv'], default: 'json', title: 'Format' }
  },
  required: ['text']
}

const transformSchema: JSONSchemaType<{ toolHash: string | null }> = {
  type: 'object',
  properties: { toolHash: { type: 'string', title: 'Tool Hash' } },
  required: []
}

export function DbNode({ id, data, selected }: NodeProps<any>) {
  const { tools: toolList, updateNodeConfig } = useContext(EditorContext)

  const title = useMemo(() => {
    const t = data?.type as string
    if (!t) return 'Node'
    const [group, name] = t.split('.')
    return `${group}: ${name}`
  }, [data?.type])

  const renderControls = () => {
    switch (data?.type) {
      case 'input.paste':
        return (
          <SchemaForm
            schema={inputPasteSchema}
            value={data?.config ?? { text: '', format: 'json' }}
            onChange={(v) => updateNodeConfig(id, v)}
          />
        )
      case 'xform.js':
      case 'xform.filter':
      case 'xform.merge':
      case 'xform.group':
      case 'xform.slice':
      case 'xform.sort':
      case 'xform.rename':
      case 'xform.geocode':
      case 'xform.color':
        return (
          <div className="space-y-2">
            <SchemaForm
              schema={transformSchema}
              value={data?.config ?? { toolHash: '' }}
              onChange={(v) => updateNodeConfig(id, v)}
            />
            <div>
              <label className="mb-0.5 block text-sm text-gray-600">Select Tool</label>
              <select
                className="w-full rounded border border-gray-200 px-2 py-1 text-sm"
                value={data?.config?.toolHash ?? ''}
                onChange={(e) => updateNodeConfig(id, { ...(data?.config ?? {}), toolHash: e.target.value })}
              >
                <option value="">—</option>
                {toolList.map((t) => (
                  <option key={t.hash} value={t.hash}>
                    {t.label} ({t.hash.slice(0, 8)})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )
      default:
        return <div className="text-xs text-gray-500">No controls</div>
    }
  }

  return (
    <div
      className={`rounded-lg border border-gray-200 bg-white p-2 shadow-sm ${selected ? 'ring-2 ring-blue-400' : ''}`}
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm font-semibold">{title}</div>
      </div>
      <div className="space-y-2">{renderControls()}</div>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </div>
  )
}
