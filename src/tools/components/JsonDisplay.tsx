import { useHookstate } from '@hookstate/core'
import 'monaco-editor/esm/vs/editor/editor.main'
import React, { useEffect, useMemo, useRef, useState } from 'react'

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
  const [validationError, setValidationError] = useState<string | null>(null)

  // Monaco editor refs/state
  const containerRef = useRef<HTMLDivElement | null>(null)
  const editorRef = useRef<import('monaco-editor').editor.IStandaloneCodeEditor | null>(null)
  const monacoRef = useRef<typeof import('monaco-editor/esm/vs/editor/editor.api') | null>(null)

  const initialText = useMemo(() => {
    return format === 'json' ? JSON.stringify(data, null, 2) : (data ?? '').toString()
  }, [data, format])

  // Map our format prop to Monaco language ids
  const language = useMemo(() => {
    switch (format) {
      case 'json':
        return 'json'
      case 'javascript':
        return 'javascript'
      case 'xml':
        return 'xml'
      default:
        return 'plaintext'
    }
  }, [format])

  // Lazy-load monaco + workers on mount when the editor container is visible
  useEffect(() => {
    if (!containerRef.current || minimized.get()) return

    let disposed = false

    ;(async () => {
      // Import monaco and workers dynamically to avoid SSR issues and reduce bundle until needed
      const [monaco, editorWorker, jsonWorker, cssWorker, htmlWorker, tsWorker] = await Promise.all([
        import('monaco-editor/esm/vs/editor/editor.api'),
        import('monaco-editor/esm/vs/editor/editor.worker?worker'),
        import('monaco-editor/esm/vs/language/json/json.worker?worker'),
        import('monaco-editor/esm/vs/language/css/css.worker?worker'),
        import('monaco-editor/esm/vs/language/html/html.worker?worker'),
        import('monaco-editor/esm/vs/language/typescript/ts.worker?worker')
      ])

      // Configure Monaco workers once per window
      const g = globalThis as any
      if (!g.__MONACO_WORKERS__) {
        g.MonacoEnvironment = {
          getWorker(_: string, label: string) {
            if (label === 'json') return new (jsonWorker as any).default()
            if (label === 'css' || label === 'scss' || label === 'less') return new (cssWorker as any).default()
            if (label === 'html' || label === 'handlebars' || label === 'razor' || label === 'xml')
              return new (htmlWorker as any).default()
            if (label === 'typescript' || label === 'javascript') return new (tsWorker as any).default()
            return new (editorWorker as any).default()
          }
        }
        g.__MONACO_WORKERS__ = true
      }

      if (disposed || !containerRef.current) return

      monacoRef.current = monaco

      // Create editor instance
      const editor = monaco.editor.create(containerRef.current, {
        value: initialText,
        language,
        readOnly: !editable || !isEditing,
        automaticLayout: true,
        minimap: { enabled: false },
        wordWrap: 'on',
        scrollBeyondLastLine: false,
        theme: 'vs',
        fontSize: 12
      })
      editorRef.current = editor

      // If not editing, keep model in sync with props
      // We'll handle subsequent updates in another effect
    })()

    return () => {
      disposed = true
      if (editorRef.current) {
        editorRef.current.dispose()
        editorRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editable, language, minimized.get()])

  // Sync content when props.data changes, but only when not editing to avoid clobbering user edits
  useEffect(() => {
    const editor = editorRef.current
    if (!editor || isEditing) return
    const current = editor.getValue()
    if (current !== initialText) editor.setValue(initialText)
  }, [initialText, isEditing])

  // Update readOnly and language when editing state changes
  useEffect(() => {
    const editor = editorRef.current
    const monaco = monacoRef.current
    if (!editor || !monaco) return
    editor.updateOptions({ readOnly: !editable || !isEditing })
    const model = editor.getModel()
    if (model) monaco.editor.setModelLanguage(model, language)
  }, [isEditing, editable, language])

  const handleCopy = () => {
    navigator.clipboard.writeText(format === 'json' ? JSON.stringify(data, null, 2) : (data ?? '').toString())
  }

  const handleSaveToFile = () => {
    const editor = editorRef.current
    const currentText = editor && isEditing ? editor.getValue() : initialText

    // Determine filename and mime type from format
    const slug = (title || 'data')
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9\-_.]/g, '')
    const ext = format === 'json' ? 'json' : format === 'javascript' ? 'js' : format === 'xml' ? 'xml' : 'txt'
    const mime =
      format === 'json'
        ? 'application/json;charset=utf-8'
        : format === 'javascript'
        ? 'application/javascript;charset=utf-8'
        : format === 'xml'
        ? 'application/xml;charset=utf-8'
        : 'text/plain;charset=utf-8'

    const blob = new Blob([currentText ?? ''], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${slug || 'data'}.${ext}`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const handleEdit = () => {
    setIsEditing(true)
    setValidationError(null)
    // Ensure editor reflects current data when starting edit
    const editor = editorRef.current
    if (editor) editor.setValue(format === 'json' ? JSON.stringify(data, null, 2) : (data ?? '').toString())
  }

  const handleSave = () => {
    const editor = editorRef.current
    const value = editor ? editor.getValue() : initialText
    if (format === 'json') {
      try {
        const parsedData = JSON.parse(value)
        onDataChange?.(parsedData)
        setIsEditing(false)
        setValidationError(null)
      } catch {
        setValidationError('Invalid JSON format')
      }
    } else {
      onDataChange?.(value)
      setIsEditing(false)
      setValidationError(null)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    setValidationError(null)
    // Revert editor value to the current prop data
    const editor = editorRef.current
    if (editor) editor.setValue(format === 'json' ? JSON.stringify(data, null, 2) : (data ?? '').toString())
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
          {data && (
            <button
              onClick={handleSaveToFile}
              className="rounded bg-green-100 px-3 py-1 text-sm text-green-700 transition-colors hover:bg-green-200"
            >
              Save
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
          <div className={`w-full rounded-lg border ${isEditing ? 'bg-white' : 'bg-gray-50'} `}>
            <div ref={containerRef} className="h-96 w-full" />
          </div>
          {validationError && (
            <div className="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-600">{validationError}</div>
          )}
          {editable && isEditing && (
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
          )}
        </div>
      )}
    </>
  )
}
