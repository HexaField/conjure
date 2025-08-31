import React from 'react'
import { GraphWorkbench } from '../graph/GraphWorkbench'
import { AppBar } from './AppBar'
import { BottomPanel } from './BottomPanel'
import { LeftSidebar } from './LeftSidebar'
import { RightPane } from './RightPane'

export const AppShell: React.FC = () => {
  return (
    <div className="flex h-full flex-col bg-[#F7F8FA] text-[#111827]" data-theme="light">
      <AppBar />
      <div className="grid h-[calc(100%-56px)] gap-3 p-3 sm:grid-cols-[320px,1fr,360px]">
        <LeftSidebar />
        <div className="overflow-hidden rounded-xl bg-white shadow-[0_10px_20px_rgba(0,0,0,0.06)]">
          <GraphWorkbench />
        </div>
        <RightPane />
      </div>
      <BottomPanel />
      {/* Toasts and Command Palette hooks can be added later */}
    </div>
  )
}
