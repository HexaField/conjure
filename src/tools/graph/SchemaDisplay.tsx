import { useHookstate } from '@hookstate/core'
import { NO_PROXY, setNestedObject } from '@ir-engine/hyperflux'
import React, { useEffect } from 'react'
import { useSearchParam } from '../../utils/useSearchParam'
import { JSONPreview } from './components/JSONPreview'
import { allRequirementsMet } from './functions/allRequirementsMet'
import { JSONMappingSchema, JSONSchema } from './functions/generateJsonSchema'

const buildEmptyStructureFromSchema = (schema: JSONSchema): any => {
  if (schema.type === 'object' && schema.properties) {
    let result: any = {}
    for (const key in schema.properties) {
      const childSchema = schema.properties[key]
      if (childSchema.type === 'object' && childSchema.properties) {
        result[key] = buildEmptyStructureFromSchema(childSchema)
      } else if (childSchema.type === 'array' && childSchema.items && childSchema.items.type === 'object') {
        result[key] = [buildEmptyStructureFromSchema(childSchema.items)]
      } else if (childSchema.type === 'array' && childSchema.items) {
        result[key] = []
      } else {
        result[key] = ''
      }
    }
    return result
  } else if (schema.type === 'array' && schema.items) {
    if (schema.items.type === 'array') {
      return []
    } else {
      return [buildEmptyStructureFromSchema(schema.items)]
    }
  } else {
    return ''
  }
}

const GraphMappingSettings = (props: {
  jsonSchema: JSONSchema
  targetSchema: JSONSchema
  onChange: (mapping: JSONMappingSchema) => void
}) => {
  const { jsonSchema, targetSchema, onChange } = props

  // Graph mapping state.
  const graphMappingState = useHookstate<JSONMappingSchema>(() => {
    try {
      const fromURL = new URLSearchParams(window.location.search).get('mapping')
      if (fromURL) {
        return JSON.parse(fromURL)
      }
    } catch (e) {
      //
    }
    return structuredClone(targetSchema)
  })

  // On mount - if a mapping exists and all requirements are met, call onChange
  useEffect(() => {
    if (allRequirementsMet(graphMappingState.get(NO_PROXY))) {
      onChange(graphMappingState.get(NO_PROXY))
    }
  }, [])

  const updateMapping = (path: string, newValue: string) => {
    const currentState = structuredClone(graphMappingState.get(NO_PROXY))
    setNestedObject(currentState, path, newValue)
    graphMappingState.merge(currentState)
    if (allRequirementsMet(graphMappingState.get(NO_PROXY))) {
      onChange(graphMappingState.get(NO_PROXY))
    }
  }

  useSearchParam('mapping', graphMappingState.value)

  return (
    <div className="6xl mx-auto p-4">
      <h3 className="mb-2 text-xl font-semibold">Forcegraph Mapping</h3>
      <div>
        <h4 className="mb-2 text-lg font-medium">Nodes</h4>
        <table className="min-w-full border border-gray-200 bg-white">
          <thead>
            <tr>
              <th className="border-b px-4 py-2 text-left">Graph Field</th>
              <th className="border-b px-4 py-2 text-left">Mapped Schema Field</th>
            </tr>
          </thead>
          <tbody>
            <ObjectSchemaOptions
              dataSchema={jsonSchema}
              schema={graphMappingState.get(NO_PROXY)}
              path=""
              onChange={updateMapping}
            />
          </tbody>
        </table>
      </div>
      {targetSchema && <JSONPreview json={graphMappingState.get(NO_PROXY)} title="Mapping" />}
    </div>
  )
}

/**
 * Recursively renders a table of schema properties with dropdowns for mapping.
 */
const ObjectSchemaOptions: React.FC<{
  dataSchema?: JSONSchema
  schema: JSONMappingSchema
  path: string
  parentLabel?: string
  onChange: (path: string, e: string) => void
}> = ({ dataSchema, schema, parentLabel, path, onChange }) => {
  if (!schema || !schema.properties) return null

  return (
    <>
      {Object.keys(schema.properties).map((key) => (
        <ObjetSchemaProperty
          key={key}
          dataSchema={dataSchema}
          schema={schema}
          schemaKey={key}
          parentLabel={parentLabel}
          path={path}
          onChange={onChange}
        />
      ))}
    </>
  )
}

const ObjetSchemaProperty: React.FC<{
  dataSchema?: JSONSchema
  schema: JSONMappingSchema
  schemaKey: string
  parentLabel?: string
  path: string
  onChange: (path: string, e: string) => void
}> = (props) => {
  const { dataSchema, schema, schemaKey: key, parentLabel, path, onChange } = props

  const options = Object.entries(dataSchema?.properties ?? {}).map(([key, val]) => ({
    value: key,
    label: `${key} (${val.type})`
  }))
  options.unshift({ value: '', label: 'None' })

  const childSchema = schema.properties![key]

  const childDataSchema = childSchema.value ? dataSchema?.properties?.[childSchema.value as string] : undefined
  const isRequirementMet = childSchema.optional ? true : !!childSchema.value

  const label = parentLabel ? `${parentLabel}.${key}` : key

  if (childSchema.type === 'object' && childSchema.properties) {
    return (
      <React.Fragment key={key}>
        <tr>
          <td className="border-b px-4 py-2">{label}</td>
          <td className="border-b px-4 py-2">Nested Object</td>
        </tr>
        <ObjectSchemaOptions
          dataSchema={childDataSchema}
          schema={childSchema}
          parentLabel={label}
          path={path ? `${path}.properties.${key}` : `properties.${key}`}
          onChange={onChange}
        />
      </React.Fragment>
    )
  }
  if (childSchema.type === 'array' && childSchema.items) {
    return (
      <React.Fragment key={key}>
        <tr>
          <td className="border-b px-4 py-2">{label}</td>
          <td className="border-b px-4 py-2">
            <select
              className={`rounded border p-2 ${isRequirementMet ? '' : 'border-red-500'}`}
              value={childSchema.value as string}
              onChange={(e) =>
                onChange(path ? `${path}.properties.${key}.value` : `properties.${key}.value`, e.target.value)
              }
            >
              {options.map((option, i) => (
                <option key={i} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </td>
        </tr>
        <ObjectSchemaOptions
          dataSchema={childDataSchema?.items ? childDataSchema.items : childDataSchema}
          schema={childSchema.items}
          parentLabel={label}
          path={path ? `${path}.properties.${key}.items` : `properties.${key}.items`}
          onChange={onChange}
        />
      </React.Fragment>
    )
  }
  return (
    <tr key={key}>
      <td className="border-b px-4 py-2">{label}</td>
      <td className="border-b px-4 py-2">
        <select
          className={`rounded border p-2 ${isRequirementMet ? '' : 'border-red-500'}`}
          value={childSchema.value as string}
          onChange={(e) =>
            onChange(path ? `${path}.properties.${key}.value` : `properties.${key}.value`, e.target.value)
          }
        >
          {options.map((option, i) => (
            <option key={i} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </td>
    </tr>
  )
}

export default GraphMappingSettings
