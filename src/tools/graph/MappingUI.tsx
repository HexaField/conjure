import { DndWrapper } from '@ir-engine/editor/src/components/dnd/DndWrapper'
import { ItemTypes } from '@ir-engine/editor/src/constants/AssetTypes'
import { getState, NO_PROXY, useHookstate } from '@ir-engine/hyperflux'
import { Button, Input } from '@ir-engine/ui'
import React, { useEffect } from 'react'
import { useDrop } from 'react-dnd'
import { HiChevronLeft, HiChevronRight } from 'react-icons/hi'
import { useSearchParam } from '../../utils/useSearchParam'
import { JSONPreview } from './components/JSONPreview'
import { MappedTransformationTool, SourceFetchTool, TargetVisualizationState } from './DataState'
import { JSONMappingSchema, JSONSchema } from './functions/generateJsonSchema'
import SchemaDisplay from './SchemaDisplay'

export const MappingUI = () => {
  // Global visualization type state.
  const visualizationType = useHookstate('hexafield.conjure.graph-tool.ForceGraph') // todo put in search params once we have multiple
  const targetSchema = getState(TargetVisualizationState)[visualizationType.get()]?.value

  const onConfirm = () => {
    if (!finalDataState.value) return
    getState(TargetVisualizationState)[visualizationType.get()].onConfirm(finalDataState.get(NO_PROXY))
    showMappingUI.set(false)
  }

  const showMappingUI = useHookstate(true)

  const mapSourceResults = useHookstate({} as unknown)

  const onSourceChanged = (data: { mapping: JSONMappingSchema; data: any }) => {
    try {
      const { transformedData } = MappedTransformationTool.implementation({ mapping: data.mapping, data: data.data })
      mapSourceResults.set(transformedData)
    } catch (e) {
      console.error(e)
    }
  }

  const finalDataState = useHookstate<any | null>(null)

  useEffect(() => {
    /** @todo since we implemented it with multi-source, and we no longer have the url, hack it from the search params */
    const url = new URLSearchParams(window.location.search).get('url')!
    const data = { [url]: mapSourceResults.get(NO_PROXY) }
    try {
      const finalData = data ? getState(TargetVisualizationState)[visualizationType.get()].onData(data) : null
      finalDataState.set(finalData)
    } catch (e) {
      console.error(e)
    }
  }, [mapSourceResults])

  useEffect(() => {
    onConfirm()
  }, [finalDataState])

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
          <h2 className="mb-4 text-2xl font-semibold">Graph Mapping Settings</h2>

          {/* Global Visualization Type Selection */}
          <div className="mb-6">
            <label htmlFor="visType" className="mb-2 block font-medium">
              Select Visualization Type:
            </label>
            <select
              id="visType"
              className="rounded border p-2"
              value={visualizationType.get()}
              onChange={(e) => visualizationType.set(e.target.value)}
            >
              {Object.values(getState(TargetVisualizationState)).map((option, i) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <MappingSource targetSchema={targetSchema} onChange={onSourceChanged} />
          <Button className="pointer-events-auto z-10 mb-1 p-4" variant="tertiary" onClick={onConfirm}>
            Confirm
          </Button>
          {finalDataState.value && <JSONPreview json={finalDataState.get(NO_PROXY)} title="Output Data" />}
        </div>
      </div>
    </div>
  )
}

const MappingSource = (props: {
  targetSchema: JSONSchema
  onChange: (args: { mapping: JSONMappingSchema; data: any }) => void
}) => {
  const currentInputData = useHookstate<{ schema: JSONSchema; data: unknown } | null>(null)

  const onNewData = (data: { schema: JSONSchema; data: unknown }) => {
    currentInputData.set(data)
  }

  const onMappingChanged = (mapping: JSONMappingSchema) => {
    if (!mapping || !currentInputData.value?.data) return

    const { data } = currentInputData.get(NO_PROXY)!

    props.onChange({ mapping, data })
  }

  const openUI = useHookstate(true)

  return (
    <>
      <div className="flex flex-row">
        <Button
          className="p-4"
          variant="tertiary"
          style={{ top: '10px', left: openUI.value ? '310px' : '10px' }}
          onClick={() => openUI.set(!openUI.value)}
        >
          {openUI.value ? (
            <HiChevronLeft className="text-theme-primary pointer-events-none place-self-center" />
          ) : (
            <HiChevronRight className="text-theme-primary pointer-events-none place-self-center" />
          )}
        </Button>
      </div>
      <div className="h-full overflow-auto overflow-y-auto p-4" style={{ display: openUI.value ? 'block' : 'none' }}>
        <InputData onNewData={onNewData} />
        {currentInputData.value && (
          <div className="pointer-events-auto relative z-[10] mx-auto">
            <SchemaDisplay
              jsonSchema={currentInputData.get(NO_PROXY)!.schema}
              targetSchema={props.targetSchema}
              onChange={onMappingChanged}
            />
          </div>
        )}
      </div>
    </>
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
    SourceFetchTool.implementation({ url: selectedURL.value }, abortController)
      .then(({ schema, data }) => {
        rawData.set({ schema, data })
      })
      .catch((error) => {
        console.error(error)
      })
      .finally(() => {
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
        <DnDURLAndFileUpload selectedURL={inputField.value} onChange={inputField.set} />
        {loadingData.value ? (
          <div className="rounded-r bg-gray-200 p-2">Loading...</div>
        ) : (
          <Button className="rounded-r" variant="primary" onClick={() => selectedURL.set(inputField.value.trim())}>
            Confirm
          </Button>
        )}
        {rawData.value?.schema && <JSONPreview json={rawData.get(NO_PROXY)!.schema} title="Input Schema" />}
      </div>
    </>
  )
}

export const DnDURLAndFileUpload = (props: { selectedURL: string; onChange: (val: string) => void }) => {
  return (
    <div className="flex" id="dnd-container">
      <DndWrapper id="dnd-container">
        <URLAndFileUpload value={props.selectedURL} onChange={props.onChange} />
      </DndWrapper>
    </div>
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
