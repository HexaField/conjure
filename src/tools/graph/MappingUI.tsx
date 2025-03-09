import { DndWrapper } from '@ir-engine/editor/src/components/dnd/DndWrapper'
import { ItemTypes } from '@ir-engine/editor/src/constants/AssetTypes'
import { getMutableState, NO_PROXY, none, useHookstate } from '@ir-engine/hyperflux'
import { Button, Input } from '@ir-engine/ui'
import React, { useEffect } from 'react'
import { useDrop } from 'react-dnd'
import { HiChevronLeft, HiChevronRight } from 'react-icons/hi'
import { v4 as uuidv4 } from 'uuid'
import { useSearchParam } from '../../utils/useSearchParam'
import { JSONPreview } from './components/JSONPreview'
import { d3State } from './ForceGraph'
import { flattenSchema } from './functions/flattenSchema'
import { generateJsonSchema, JSONSchema } from './functions/generateJsonSchema'
import { transformData } from './functions/transformData'
import SchemaDisplay from './SchemaDisplay'

export const MappingUI = () => {
  // Global visualization type state.
  const visualizationType = useHookstate(0) // todo put in search params once we have multiple
  const targetSchema = targetSchemas[visualizationType.get()].value

  const onConfirm = () => {
    targetSchemas[visualizationType.get()].onConfirm(transformedDataState.get(NO_PROXY))
    showMappingUI.set(false)
  }

  const showMappingUI = useHookstate(true)
  const mapSources = useHookstate(() => {
    const sources = {} as Record<string, {} | null>
    const fromURL = new URLSearchParams(window.location.search).get('sources')
    if (fromURL) {
      for (const source of fromURL.split(',')) {
        sources[source] = null
      }
    }
    return sources
  })
  const addSource = () => {
    /** @todo in the future, you'll be able to save and load mappings from an inventory, this is a placeholder for that functionality */
    mapSources.merge({ [uuidv4()]: {} })
  }
  const removeSource = (source: string) => {
    mapSources[source].set(none)
  }

  const sourceMappingAndData = useHookstate(
    {} as Record<
      string,
      {
        schema: JSONSchema
        mapping: any
        data: any
      }
    >
  )
  useSearchParam('sources', sourceMappingAndData.keys.join(','))

  const onSourceChanged = (
    sourceID: string,
    data: {
      schema: JSONSchema
      mapping: any
      data: any
    }
  ) => {
    sourceMappingAndData.merge({ [sourceID]: data })
  }

  const transformedDataState = useHookstate<any | null>(null)
  const preProcessing = useHookstate([] as Array<any>)

  useEffect(() => {
    const data = Object.fromEntries(
      Object.entries(sourceMappingAndData.get(NO_PROXY))
        .map(([k, v]) => [
          k,
          {
            ...v,
            data: transformData(v.mapping, v.data)
          }
        ])
        .filter((v) => !!v)
    ) as Record<
      string,
      {
        schema: JSONSchema
        mapping: any
        data: any
      }
    >
    try {
      const transformedData = data
        ? targetSchemas[visualizationType.get()].onData(data, preProcessing.get(NO_PROXY) as any[])
        : null
      transformedDataState.set(transformedData)
    } catch (e) {
      console.error(e)
    }
  }, [sourceMappingAndData, preProcessing])

  const onChangePreProcessing = (preProcessingTransformations: Array<any>) => {
    console.log({ preProcessingTransformations: preProcessingTransformations })
    preProcessing.set(preProcessingTransformations)
  }

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
              onChange={(e) => visualizationType.set(parseInt(e.target.value))}
            >
              {targetSchemas.map((option, i) => (
                <option key={i} value={i}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          {mapSources.keys.map((source) => (
            <MappingSource
              key={source}
              sourceID={source}
              targetSchema={targetSchema}
              onChange={(data) => onSourceChanged(source, data)}
              onRemove={() => removeSource(source)}
            />
          ))}
          <Button className="pointer-events-auto z-10 mb-1 p-4" variant="tertiary" onClick={addSource}>
            Add Source
          </Button>
          {sourceMappingAndData.keys.length && (
            <PreProcessData
              sourceMappingAndData={sourceMappingAndData.get(NO_PROXY)}
              mapSources={mapSources.get(NO_PROXY)}
              targetSchema={targetSchema}
              onChangePreProcessing={onChangePreProcessing}
            />
          )}
          <Button className="pointer-events-auto z-10 mb-1 p-4" variant="tertiary" onClick={onConfirm}>
            Confirm
          </Button>
          {transformedDataState.value && <JSONPreview json={transformedDataState.get(NO_PROXY)} title="Output Data" />}
        </div>
      </div>
    </div>
  )
}

const PreProcessData = (props: {
  sourceMappingAndData: Record<
    string,
    {
      schema: JSONSchema
      mapping: any
      data: any
    }
  >
  mapSources: Record<string, {} | null>
  targetSchema: JSONSchema
  onChangePreProcessing: (data: Array<CorrelationType>) => void
}) => {
  // const preProcessingTransformations = useHookstate([] as Array<CorrelationType>)

  return (
    <>
      {/* @todo add other kinds of postprocessing transformations to data */}
      {Object.keys(props.sourceMappingAndData).length > 1 && (
        <SourceCorrelation
          sources={props.mapSources}
          sourceResults={props.sourceMappingAndData}
          onChange={props.onChangePreProcessing}
          targetSchema={props.targetSchema}
        />
      )}
    </>
  )
}

type CorrelationType = {
  source: string
  sourceField: string[]
  target: string
  targetField: string[]
}

/**
 * Correlate fields betwen sources to deduplicate and merge data.
 */
const SourceCorrelation = (
  props: {
    sources: Record<string, {} | null>
    sourceResults: Record<
      string,
      {
        schema: JSONSchema
        mapping: any
        data: any
      }
    >
    onChange: (data: Array<CorrelationType>) => void
    targetSchema: JSONSchema
  } = {} as any
) => {
  const correlations = useHookstate<Array<CorrelationType>>(() => {
    try {
      const fromURL = new URLSearchParams(window.location.search).get('correlations')
      console.log(fromURL)
      if (fromURL) {
        console.log(fromURL, JSON.parse(fromURL))
        return JSON.parse(fromURL)
      }
    } catch (e) {
      //
    }

    return []
  })

  useSearchParam('correlations', correlations.value)

  useEffect(() => {
    props.onChange(correlations.get(NO_PROXY) as Array<CorrelationType>)
  }, [correlations])

  const setCorrelation = (index: number, args: CorrelationType) => {
    correlations[index].set(args)
  }

  const removeCorrelation = (index: number) => {
    correlations[index].set(none)
  }

  console.log({ correlations })

  return (
    <div className="mb-6">
      <h2 className="mb-4 text-2xl font-semibold">Source Correlation</h2>
      {correlations.get(NO_PROXY).map((correlation: CorrelationType, index) => (
        <Correlation
          key={index}
          correlation={correlation}
          sourceResults={props.sourceResults}
          targetSchema={props.targetSchema}
          onChange={(args) => setCorrelation(index, args)}
          onRemove={() => removeCorrelation(index)}
        />
      ))}
      <Button
        className="pointer-events-auto z-10 mb-1 p-4"
        variant="tertiary"
        onClick={() =>
          setCorrelation(correlations.length, {
            source: Object.keys(props.sourceResults)[0],
            sourceField: [],
            target: Object.keys(props.sourceResults)[1],
            targetField: []
          })
        }
      >
        Add Correlation
      </Button>
      {correlations.value && <JSONPreview json={correlations.get(NO_PROXY)} title="Correlations" />}
    </div>
  )
}

/**
 * Correlation between two fields across two sources.
 * - uses a dropdown to select the source and field
 * - uses a dropdown to select the target and field
 * - uses a button to remove the correlation
 * - uses the transformedData of the sources to populate the dropdowns using flattenSchema
 */
const Correlation = (props: {
  correlation: CorrelationType
  sourceResults: Record<
    string,
    {
      schema: JSONSchema
      mapping: any
      data: any
    }
  >
  targetSchema: JSONSchema
  onChange: (args: CorrelationType) => void
  onRemove: (index: number) => void
}) => {
  const { correlation, sourceResults, targetSchema, onChange, onRemove } = props

  const flattenedFields = useHookstate({} as Record<string, string[]>)

  useEffect(() => {
    if (!correlation.source || !correlation.target) return
    const sourceData = sourceResults[correlation.source]
    const targetData = sourceResults[correlation.target]
    if (!sourceData || !targetData) return
    const sourceFields = Object.keys(flattenSchema(sourceData.schema, '', sourceData.data))
    const targetFields = Object.keys(flattenSchema(targetData.schema, '', targetData.data))
    flattenedFields.set({
      [correlation.source]: sourceFields,
      [correlation.target]: targetFields
    })
  }, [correlation.source, correlation.target])

  const sourceOptions = Object.keys(sourceResults).map((source) => ({
    value: source,
    label: source
  }))
  const sourceFieldOptions = flattenedFields.get(NO_PROXY)[correlation.source]?.map((field) => ({
    value: field,
    label: field
  }))
  const targetFieldOptions = flattenedFields.get(NO_PROXY)[correlation.target]?.map((field) => ({
    value: field,
    label: field
  }))

  return (
    <div className="mb-4 flex flex-col">
      <select
        className="rounded border p-2"
        value={correlation.source}
        onChange={(e) => onChange({ ...correlation, source: e.target.value })}
      >
        {sourceOptions?.map((option, i) => (
          <option key={i} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <MultiFieldPatternCreator
        value={correlation.sourceField}
        options={sourceFieldOptions || []}
        onChange={(patterns) => onChange({ ...correlation, sourceField: patterns })}
      />
      <select
        className="rounded border p-2"
        value={correlation.target}
        onChange={(e) => onChange({ ...correlation, target: e.target.value })}
      >
        {sourceOptions?.map((option, i) => (
          <option key={i} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <MultiFieldPatternCreator
        value={correlation.targetField}
        options={targetFieldOptions || []}
        onChange={(patterns) => onChange({ ...correlation, targetField: patterns })}
      />
      <Button className="rounded" variant="tertiary" onClick={() => onRemove(0)}>
        Remove
      </Button>
    </div>
  )
}

const JoinKinds = [
  { value: '', label: 'None' },
  { value: ' ', label: ' ' },
  { value: ',', label: ',' },
  { value: '-', label: '-' },
  { value: ':', label: ':' },
  { value: '_', label: '_' }
]

/**
 * From a list of options, create a pattern to match combinations of fields.
 * - For now just a simple select dropdown with a join kind select.
 */
const MultiFieldPatternCreator = (props: {
  value: string[]
  options: Array<{ value: string; label: string }>
  onChange: (args: string[]) => void
}) => {
  const patterns = useHookstate<string[]>([])
  const joinKind = useHookstate(' ')
  const patternValue = props.value.filter((v) => v !== joinKind.value)

  useEffect(() => {
    // if a join kind is selected, between each pattern, add the join kind
    if (joinKind.value !== '') {
      const newPatterns = [] as string[]
      for (let i = 0; i < patterns.length; i++) {
        newPatterns.push(patterns.value[i])
        if (i < patterns.length - 1) {
          newPatterns.push(joinKind.value)
        }
      }
      props.onChange(newPatterns)
    } else {
      props.onChange(patterns.get(NO_PROXY) as string[])
    }
  }, [patterns, joinKind])

  return (
    <div className="mb-4 flex flex-row">
      {patternValue.map((pattern, i) => (
        <select
          key={i}
          className="rounded border p-2"
          value={pattern}
          onChange={(e) => patterns[i].set(e.target.value)}
        >
          {props.options.map((option, i) => (
            <>
              <option key={i} value={option.value}>
                {option.label}
              </option>
            </>
          ))}
        </select>
      ))}
      <Button className="rounded" variant="tertiary" size="xs" onClick={() => patterns[patterns.length - 1].set(none)}>
        -
      </Button>
      <Button className="rounded" variant="tertiary" size="xs" onClick={() => patterns.merge([''])}>
        +
      </Button>
      <select className="rounded border p-2" value={joinKind.value} onChange={(e) => joinKind.set(e.target.value)}>
        {JoinKinds.map((option, i) => (
          <option key={i} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}

const MappingSource = (props: {
  sourceID: string
  targetSchema: JSONSchema
  onChange: (args: { mapping: any; data: any; schema: JSONSchema }) => void
  onRemove: () => void
}) => {
  const currentInputData = useHookstate<{ schema: JSONSchema; data: unknown } | null>(null)

  const onNewData = (data: { schema: JSONSchema; data: unknown }) => {
    currentInputData.set(data)
  }

  const onMappingChanged = (mapping: any) => {
    if (!mapping || !currentInputData.value?.data) return

    const { data, schema } = currentInputData.get(NO_PROXY)!

    props.onChange({ mapping, data, schema })
  }

  const openUI = useHookstate(false)

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
        {props.sourceID}
        <Button className="pointer-events-auto z-10 mb-1 p-4" variant="tertiary" onClick={props.onRemove}>
          Remove Source
        </Button>
      </div>
      <div className="h-full overflow-auto overflow-y-auto p-4" style={{ display: openUI.value ? 'block' : 'none' }}>
        <InputData sourceID={props.sourceID} onNewData={onNewData} />
        {currentInputData.value && (
          <div className="pointer-events-auto relative z-[10] mx-auto">
            <SchemaDisplay
              sourceID={props.sourceID}
              jsonSchema={currentInputData.get(NO_PROXY)!.schema}
              targetSchema={props.targetSchema}
              data={currentInputData.get(NO_PROXY)!.data}
              onChange={onMappingChanged}
            />
          </div>
        )}
      </div>
    </>
  )
}

const InputData = (props: { sourceID: string; onNewData: (data: { schema: JSONSchema; data: unknown }) => void }) => {
  const rawData = useHookstate<{ schema: JSONSchema; data: unknown } | null>(null)

  const selectedURL = useHookstate(new URLSearchParams(window.location.search).get(props.sourceID + '-url') || '')
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

  useSearchParam(`${props.sourceID}-url`, selectedURL.value.startsWith('blob://') ? '' : selectedURL.value)

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
        {rawData.value?.schema && <JSONPreview json={rawData.get(NO_PROXY)!.schema} title="Input Schema" />}
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

type ForceGraphShape = {
  nodes: Array<{
    id: string
    label: string
    group?: string
    image?: string
  }>
  edges: Array<{
    source: string
    target: string
    weight?: number
  }>
}

type TargetSchema<T> = {
  label: string
  value: JSONSchema
  onData: (data: Record<string, Partial<T>>, processing: Array<any>) => T
  onConfirm: (data: T) => void
}

const targetSchemas: Array<TargetSchema<any>> = [
  {
    label: 'Force Graph',
    value: forcegraphSchema,
    // our only pre-processing step is to merge the data from the various sources, deduplicating by the source and target fields specified in the correlations
    // we want to use our mapping to get the fields in common between the sources, to be used to merge nodes in our graph

    onData: (data: Record<string, ForceGraphShape>, mappings: Record<string, any>, processing: Array<any>) => {
      const finalData: ForceGraphShape = { nodes: [], edges: [] }
      for (const sourceID in data) {
        const source = data[sourceID]
        if (typeof source !== 'object') continue
        //sum the various data sources together, distinguishing different sources by the 'category' field on nodes
        /** @todo this should be a configurable field in the mapping UI - need support for a 'literal' either at the source or overall level */
        if (Array.isArray(source.nodes)) {
          for (const node of source.nodes) {
            finalData.nodes.push({
              ...node,
              group: sourceID
            })
          }
        }
        if (Array.isArray(source.edges)) {
          for (const edge of source.edges) {
            finalData.edges.push(edge)
          }
        }
      }
      // ensure all edges have a weight
      for (const edge of finalData.edges) {
        edge.weight = edge.weight || 1
      }

      return finalData
    },

    onConfirm: (data) => {
      getMutableState(d3State).dataset.set(data)
    }
  }
]
