import { getMutableState, useHookstate } from '@ir-engine/hyperflux'
import { Button } from '@ir-engine/ui'
import React from 'react'
import { HiChevronLeft, HiChevronRight } from 'react-icons/hi'
import EditTool from './EditTool'
import { ToolRegistry } from './ToolRegistry'

const UseToolsMenu = () => {
  const tools = useHookstate(getMutableState(ToolRegistry).tools)

  return (
    <div className="rounded-lg bg-white p-6 shadow-md">
      <h2 className="mb-4 text-xl font-semibold">Available Tools</h2>
      <ul className="space-y-4">
        {Object.entries(tools.value).map(([id, tool]) => (
          <li key={id} className="flex items-center justify-between">
            <span className="text-gray-800">{tool.label}</span>
            <button
              // onClick={() => tool.onActivate()}
              className="rounded bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
            >
              Activate
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

const tabs = [
  { name: 'Graph', value: 'graph' },
  { name: 'Edit', value: 'edit' }
] as const

function ToolMenus(): JSX.Element {
  const tab = useHookstate('graph' as 'graph' | 'edit')
  const setTab = (value: 'graph' | 'edit') => {
    tab.set(value)
  }

  return (
    <div className="pointer-events-auto min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="mb-4 flex items-center justify-center space-x-4">
        {tabs.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab.value === t.value ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            {t.name}
          </button>
        ))}
      </div>
      <div className="mx-auto max-w-4xl space-y-6">{tab.value === 'graph' ? <UseToolsMenu /> : <EditTool />}</div>
    </div>
  )
}

function ToolUI() {
  const showMappingUI = useHookstate(true)
  return (
    <div className="pointer-events-auto z-[10] h-fit w-fit overflow-auto overflow-x-auto overflow-y-auto rounded-lg bg-white p-4">
      <div className="flex flex-row p-4">
        <Button
          className="p-4"
          variant="tertiary"
          style={{ top: '10px', left: showMappingUI.value ? '310px' : '10px' }}
          onClick={() => showMappingUI.set(!showMappingUI.value)}
        >
          {showMappingUI.value ? (
            <HiChevronLeft className="text-theme-primary pointer-events-none place-self-center" />
          ) : (
            <HiChevronRight className="text-theme-primary pointer-events-none place-self-center" />
          )}
        </Button>
        <div
          className="h-full overflow-auto overflow-y-auto p-4"
          style={{ display: showMappingUI.value ? 'block' : 'none' }}
        >
          <h2 className="mb-4 text-2xl font-semibold">Tool Menu</h2>
          <ToolMenus />
        </div>
      </div>
    </div>
  )
}

export default ToolUI
