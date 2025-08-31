import React from 'react'

export type ToolLite = {
  hash: string
  label: string
}

export type EditorContextValue = {
  tools: ToolLite[]
  updateNodeConfig: (id: string, config: any) => void
}

export const EditorContext = React.createContext<EditorContextValue>({ tools: [], updateNodeConfig: () => {} })
