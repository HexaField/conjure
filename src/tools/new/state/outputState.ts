import { defineState, useMutableState } from '@ir-engine/hyperflux'

export type OutputDatatype = 'table' | 'json' | 'geojson' | 'chart'

export const OutputState = defineState({
  name: 'hexafield.conjure.new.Output',
  initial: { datatype: 'json' as OutputDatatype, data: null as any }
})

export const useOutput = () => {
  const s = useMutableState(OutputState)
  const exportAs = (format: 'csv' | 'json' | 'geojson') => {
    const data = s.value.data
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `output.${format}`
    a.click()
    URL.revokeObjectURL(url)
  }
  return { datatype: s.value.datatype, data: s.value.data, exportAs }
}
