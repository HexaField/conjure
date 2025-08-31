import { defineState, useMutableState } from '@ir-engine/hyperflux'

type LibraryItem = { type: string; label: string; icon?: string; group: string }

const RAW_ITEMS: LibraryItem[] = [
  // Input
  { type: 'input.file', label: 'File', icon: '📄', group: 'Input' },
  { type: 'input.paste', label: 'Paste', icon: '📋', group: 'Input' },
  { type: 'input.sheets', label: 'Sheets', icon: '🧾', group: 'Input' },
  { type: 'input.example', label: 'Example Data', icon: '✨', group: 'Input' },
  // Transform
  { type: 'xform.filter', label: 'Filter', icon: '⛲', group: 'Transform' },
  { type: 'xform.merge', label: 'Merge/Join', icon: '🔀', group: 'Transform' },
  { type: 'xform.group', label: 'Group', icon: '🧩', group: 'Transform' },
  { type: 'xform.slice', label: 'Slice', icon: '✂️', group: 'Transform' },
  { type: 'xform.sort', label: 'Sort', icon: '↕️', group: 'Transform' },
  { type: 'xform.rename', label: 'Rename', icon: '✏️', group: 'Transform' },
  { type: 'xform.js', label: 'Javascript', icon: '🧠', group: 'Transform' },
  { type: 'xform.geocode', label: 'Geocode', icon: '📍', group: 'Transform' },
  { type: 'xform.color', label: 'Colorize', icon: '🎨', group: 'Transform' },
  // Geo
  { type: 'geo.bbox', label: 'Bounding Box', icon: '⬛', group: 'Geo Data' },
  { type: 'geo.centroid', label: 'Centroid', icon: '•', group: 'Geo Data' },
  // Viz
  { type: 'viz.table', label: 'Table', icon: '📊', group: 'Visualization' },
  { type: 'viz.scatter', label: 'Scatterplot', icon: '🟣', group: 'Visualization' },
  { type: 'viz.bar', label: 'Bar Chart', icon: '📈', group: 'Visualization' },
  { type: 'viz.hist', label: 'Histogram', icon: '📉', group: 'Visualization' },
  // Utility
  { type: 'util.markdown', label: 'Markdown', icon: '📝', group: 'Utilities' },
  { type: 'util.stats', label: 'Statistics', icon: '∑', group: 'Utilities' }
]

export const LibraryState = defineState({
  name: 'hexafield.conjure.new.Library',
  initial: { filter: '', items: RAW_ITEMS }
})

export const useLibrary = () => {
  const state = useMutableState(LibraryState)
  const filter = state.filter.value
  const setFilter = (v: string) => state.filter.set(v)

  const filtered = state.items.value.filter((i) =>
    [i.type, i.label, i.group].some((x) => x.toLowerCase().includes(filter.toLowerCase()))
  )
  const groups = Array.from(new Set(filtered.map((i) => i.group))).map((title) => ({
    title,
    items: filtered.filter((i) => i.group === title)
  }))

  const startDrag = (e: React.DragEvent, item: LibraryItem) => {
    e.dataTransfer.setData('application/x-Pipeline', JSON.stringify({ type: item.type }))
    e.dataTransfer.effectAllowed = 'copy'
  }

  return { groups, filter, setFilter, startDrag }
}
