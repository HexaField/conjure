import { DndWrapper } from '@ir-engine/editor/src/components/dnd/DndWrapper'
import { ItemTypes } from '@ir-engine/editor/src/constants/AssetTypes'
import { getMutableState, NO_PROXY, useHookstate } from '@ir-engine/hyperflux'
import { Button, Input } from '@ir-engine/ui'
import React, { useEffect } from 'react'
import { useDrop } from 'react-dnd'
import { HiChevronLeft, HiChevronRight } from 'react-icons/hi'
import { useSearchParam } from '../../utils/useSearchParam'
import { JSONPreview } from './components/JSONPreview'
import { d3State } from './ForceGraph'
import { generateJsonSchema, JSONSchema } from './functions/generateJsonSchema'
import { transformData } from './functions/transformData'
import SchemaDisplay from './SchemaDisplay'

export const MappingUI = () => {
  const transformedDataState = useHookstate<any | null>(null)
  const currentInputData = useHookstate<{ schema: JSONSchema; data: unknown } | null>(null)

  const onNewData = (data: { schema: JSONSchema; data: unknown }) => {
    currentInputData.set(data)
  }

  const onMappingChanged = (mapping: any) => {
    if (!currentInputData.value?.data) return

    const { data } = currentInputData.get(NO_PROXY)!

    const transformedData = transformData(mapping, data)
    transformedDataState.set(transformedData)
  }

  const onConfirm = () => {
    // for now just hardcode the forcegraph
    for (const edge of transformedDataState.get(NO_PROXY).edges) {
      edge.weight = edge.weight || 1
    }
    getMutableState(d3State).dataset.set(transformedDataState.get(NO_PROXY))
    showMappingUI.set(false)
  }

  const showMappingUI = useHookstate(true)
  const showCurrentOutput = useHookstate(false)

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
          <InputData onNewData={onNewData} />
          {currentInputData.value && (
            <div className="pointer-events-auto relative z-[10] mx-auto">
              <SchemaDisplay
                jsonSchema={currentInputData.get(NO_PROXY)!.schema}
                targetSchemas={targetSchemas}
                data={currentInputData.get(NO_PROXY)!.data}
                onChange={onMappingChanged}
                onConfirm={onConfirm}
              />
            </div>
          )}
          {transformedDataState.value && showCurrentOutput.value && (
            <JSONPreview json={transformedDataState.get(NO_PROXY)} />
          )}
        </div>
      </div>
    </div>
  )
}

const InputData = (props: { onNewData: (data: { schema: JSONSchema; data: unknown }) => void }) => {
  const rawData = useHookstate<{ schema: JSONSchema; data: unknown } | null>(null)

  const selectedURL = useHookstate(new URLSearchParams(window.location.search).get('url') || '')
  const loadingData = useHookstate(false)

  useEffect(() => {
    if (!selectedURL.value) return
    const abortController = new AbortController()
    loadingData.set(true)
    fetch(selectedURL.value)
      .then((response) => {
        if (abortController.signal.aborted) return
        response
          .json()
          .then((data) => {
            if (abortController.signal.aborted) return
            const schema = generateJsonSchema(data)
            rawData.set({ schema, data })
          })
          .catch((error) => {
            console.error(error)
          })
          .finally(() => {
            loadingData.set(false)
          })
      })
      .catch((error) => {
        console.error(error)
        loadingData.set(false)
      })
    return () => {
      abortController.abort()
      loadingData.set(false)
    }
  }, [selectedURL])

  useSearchParam('url', selectedURL.value.startsWith('blob://') ? '' : selectedURL.value)

  useEffect(() => {
    if (!rawData.value) return
    props.onNewData(rawData.get(NO_PROXY)!)
  }, [rawData])

  const inputField = useHookstate(selectedURL.value)

  return (
    <>
      <div className="mb-4 flex flex-col">
        <label htmlFor="url-input" className="mb-2 font-medium">
          Data URL
        </label>
        <div className="flex" id="dnd-container">
          <DndWrapper id="dnd-container">
            <URLAndFileUpload value={inputField.value} onChange={inputField.set} />
          </DndWrapper>
          {loadingData.value ? (
            <div className="rounded-r bg-gray-200 p-2">Loading...</div>
          ) : (
            <Button className="rounded-r" variant="primary" onClick={() => selectedURL.set(inputField.value.trim())}>
              Confirm
            </Button>
          )}
        </div>
        {rawData.value?.schema && <JSONPreview json={rawData.get(NO_PROXY)!.schema} />}
      </div>
    </>
  )
}

const URLAndFileUpload = (props: { value: string; onChange: (value: string) => void }) => {
  const [{ canDrop, isOver }, dropRef] = useDrop({
    accept: ['application/json', ItemTypes.File],
    async drop(item: any, monitor) {
      const isDropType = item.type === 'application/json'
      if (isDropType) {
        uploadJSON(item)
      } else {
        const dndItem: any = monitor.getItem()
        const entries = Array.from(dndItem.items).map((item: any) => item.webkitGetAsEntry())
        const fileEntry = entries[0] as FileSystemFileEntry
        new Promise((resolve, reject) => fileEntry.file(resolve, reject)).then((file: File) => {
          uploadJSON(file)
        })
      }
    },
    collect: (monitor) => ({
      canDrop: monitor.canDrop(),
      isOver: monitor.isOver()
    })
  })

  const tempValue = useHookstate(props.value)

  // convert to blob url
  const uploadJSON = (file: File) => {
    const blob = new Blob([file], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    tempValue.set(url)
  }

  useEffect(() => {
    tempValue.set(props.value)
  }, [props.value])

  const onBlur = () => {
    props.onChange(tempValue.value)
  }

  useEffect(() => {
    props.onChange(tempValue.value)
  }, [tempValue.value])

  return (
    <Input
      ref={dropRef}
      value={tempValue.value ?? ''}
      onChange={(e) => {
        tempValue.set(e.target.value)
      }}
      onBlur={onBlur}
      type="text"
      autoComplete="on"
      fullWidth
    />
  )
}

const forcegraphSchema: JSONSchema = {
  type: 'object',
  properties: {
    nodes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          label: { type: 'string' },
          image: { type: 'string', optional: true }
        }
      }
    },
    edges: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          source: { type: 'string' },
          target: { type: 'string' },
          weight: { type: 'number', optional: true }
        }
      }
    }
  }
}

const targetSchemas = [
  {
    label: 'Force Graph',
    value: forcegraphSchema
  }
]
