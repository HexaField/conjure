import React from 'react'
import { useLibrary } from '../../state/libraryState'

export const LeftSidebar: React.FC = () => {
  const { groups, filter, setFilter, startDrag } = useLibrary()

  return (
    <aside className="overflow-auto rounded-xl bg-white p-2 shadow-[0_10px_20px_rgba(0,0,0,0.06)]">
      <input
        className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        placeholder="Search blocks…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />
      {groups.map((g) => (
        <section key={g.title} className="mt-2">
          <header className="mb-1 font-semibold text-gray-500">
            <span>{g.title}</span>
          </header>
          <ul className="space-y-1">
            {g.items.map((item) => (
              <li
                key={item.type}
                draggable
                onDragStart={(e) => startDrag(e, item)}
                className="flex cursor-grab items-center gap-2 rounded px-2 py-1 text-sm hover:bg-gray-100"
              >
                <span className="select-none">{item.icon ?? '●'}</span>
                <span className="truncate">{item.label}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </aside>
  )
}
