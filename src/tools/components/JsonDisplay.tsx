import { useHookstate } from '@hookstate/core'
import React, { useState } from 'react'

interface JsonDisplayProps {
  title: string
  data: any
  format?: 'json' | 'javascript' | 'plaintext' | 'xml'
  copyButtonText?: string
  editable?: boolean
  onDataChange?: (newData: any) => void
}

export function JsonDisplay({
  title,
  data,
  format = 'json',
  copyButtonText = 'Copy JSON',
  editable = false,
  onDataChange
}: JsonDisplayProps) {
  const minimized = useHookstate(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)

  const handleCopy = () => {
    navigator.clipboard.writeText(format === 'json' ? JSON.stringify(data, null, 2) : data)
  }

  const handleEdit = () => {
    setIsEditing(true)
    setEditValue(format === 'json' ? JSON.stringify(data, null, 2) : data)
    setValidationError(null)
  }

  const handleSave = () => {
    if (format === 'json') {
      try {
        const parsedData = JSON.parse(editValue)
        onDataChange?.(parsedData)
        setIsEditing(false)
        setValidationError(null)
      } catch {
        setValidationError('Invalid JSON format')
      }
    } else {
      onDataChange?.(editValue)
      setIsEditing(false)
      setValidationError(null)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditValue('')
    setValidationError(null)
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
          <button
            onClick={() => minimized.set(!minimized.get())}
            className="rounded p-1 transition-colors hover:bg-gray-100"
            aria-label={minimized.get() ? 'Expand' : 'Minimize'}
          >
            <svg
              className={`h-4 w-4 text-gray-600 transition-transform ${minimized.get() ? 'rotate-0' : 'rotate-90'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        <div className="flex gap-2">
          {editable && !isEditing && (
            <button
              onClick={handleEdit}
              className="rounded bg-blue-100 px-3 py-1 text-sm text-blue-700 transition-colors hover:bg-blue-200"
            >
              Edit
            </button>
          )}
          <button
            onClick={handleCopy}
            className="rounded bg-gray-100 px-3 py-1 text-sm text-gray-700 transition-colors hover:bg-gray-200"
          >
            {copyButtonText}
          </button>
        </div>
      </div>
      {!minimized.get() && (
        <div className="space-y-2">
          {isEditing ? (
            <>
              <textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="h-96 w-full resize-none rounded-lg border border-gray-300 bg-white p-4 font-mono text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                placeholder={format === 'json' ? 'Enter valid JSON...' : 'Enter text...'}
              />
              {validationError && (
                <div className="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-600">
                  {validationError}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  className="rounded bg-green-100 px-3 py-1 text-sm text-green-700 transition-colors hover:bg-green-200"
                >
                  Save
                </button>
                <button
                  onClick={handleCancel}
                  className="rounded bg-gray-100 px-3 py-1 text-sm text-gray-700 transition-colors hover:bg-gray-200"
                >
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <div className="max-h-96 overflow-auto rounded-lg bg-gray-50 p-4">
              {format === 'javascript' ? (
                <pre className="whitespace-pre-wrap text-sm text-gray-800">
                  <code>{data}</code>
                </pre>
              ) : (
                <pre className="whitespace-pre-wrap text-sm text-gray-800">
                  {format === 'json' ? JSON.stringify(data, null, 2) : data}
                </pre>
              )}
            </div>
          )}
        </div>
      )}
    </>
  )
}
