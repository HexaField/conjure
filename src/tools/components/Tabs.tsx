import React from 'react'

/** @todo figure out why tab typings dont work properly */
interface TabsType<T extends string> {
  tabs: { label: string; value: T }[]
  onChange: (value: T) => void
  value: T
}

export default function Tabs<T extends string>(props: TabsType<T>) {
  const { tabs, onChange, value } = props
  return (
    <div className="mb-4 flex items-center justify-center space-x-4">
      {tabs.map((t) => (
        <button
          key={t.value}
          onClick={() => onChange(t.value)}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            value === t.value ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}
