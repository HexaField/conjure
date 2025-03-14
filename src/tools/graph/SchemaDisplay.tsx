import { useHookstate } from '@hookstate/core'
import { getNestedObject, NO_PROXY, setNestedObject } from '@ir-engine/hyperflux'
import React, { useEffect, useMemo } from 'react'
import { useSearchParam } from '../../utils/useSearchParam'
import { JSONPreview } from './components/JSONPreview'
import { allRequirementsMet } from './functions/allRequirementsMet'
import { flattenSchema } from './functions/flattenSchema'
import { JSONSchema } from './functions/generateJsonSchema'

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
  sourceID: string
  jsonSchema: JSONSchema
  targetSchema: JSONSchema
  data: any
  onChange: (mapping: any) => void
}) => {
  const { sourceID, jsonSchema, targetSchema, data, onChange } = props

  // Our flattened schema.
  const flattenedFields = useMemo(() => flattenSchema(jsonSchema, '', data), [jsonSchema, data])

  // Build options for the dropdown from the flattened fields.
  const fieldOptions = Object.keys(flattenedFields).map((key) => ({
    value: key,
    label: key
  }))
  // Add an empty option.
  fieldOptions.unshift({ value: '', label: 'None' })

  // Graph mapping state.
  const graphMappingState = useHookstate<any>(() => {
    try {
      const fromURL = new URLSearchParams(window.location.search).get(sourceID + '-mapping')
      if (fromURL) {
        return JSON.parse(fromURL)
      }
    } catch (e) {
      //
    }
    return buildEmptyStructureFromSchema(targetSchema)
  })

  // On mount - if a mapping exists and all requirements are met, call onChange
  useEffect(() => {
    if (allRequirementsMet(targetSchema, graphMappingState.get(NO_PROXY))) {
      onChange(graphMappingState.get(NO_PROXY))
    }
  }, [])

  const updateMapping = (path: string, newValue: string) => {
    const currentState = structuredClone(graphMappingState.get(NO_PROXY))
    setNestedObject(currentState, path, newValue)
    graphMappingState.merge(currentState)
    if (allRequirementsMet(targetSchema, graphMappingState.get(NO_PROXY))) {
      onChange(graphMappingState.get(NO_PROXY))
    } else {
      onChange(null)
    }
  }

  useSearchParam(`${sourceID}-mapping`, graphMappingState.value)

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
              schema={targetSchema}
              options={fieldOptions}
              path=""
              onChange={updateMapping}
              value={graphMappingState.get()}
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
  schema: JSONSchema
  path: string
  options: Array<{ value: string; label: string }>
  value: any
  onChange: (path: string, e: string) => void
}> = ({ schema, path, options, value, onChange }) => {
  if (!schema || !schema.properties) return null

  const isFieldMet = (key: string) => {
    const fieldValue = getNestedObject(value, path ? `${path}.${key}` : key).result
    return fieldValue !== undefined && fieldValue !== ''
  }

  return (
    <>
      {Object.keys(schema.properties).map((key) => {
        const childSchema = schema.properties![key]
        const isOptional = childSchema.optional || false
        const fieldMet = isFieldMet(key)

        if (childSchema.type === 'object' && childSchema.properties) {
          return (
            <React.Fragment key={key}>
              <tr>
                <td className="border-b px-4 py-2">{key}</td>
                <td className="border-b px-4 py-2">Nested Object</td>
              </tr>
              <ObjectSchemaOptions
                schema={childSchema}
                options={options}
                path={path ? `${path}.${key}` : key}
                value={value}
                onChange={onChange}
              />
            </React.Fragment>
          )
        }
        if (childSchema.type === 'array' && childSchema.items) {
          return (
            <React.Fragment key={key}>
              <tr>
                <td className="border-b px-4 py-2">{key}</td>
                <td className="border-b px-4 py-2">Array of Objects</td>
              </tr>
              <ObjectSchemaOptions
                schema={childSchema.items}
                options={options}
                path={path ? `${path}.0.${key}` : key + '.0'}
                value={value}
                onChange={onChange}
              />
            </React.Fragment>
          )
        }
        return (
          <tr key={key}>
            <td className="border-b px-4 py-2">{key}</td>
            <td className="border-b px-4 py-2">
              <select
                className={`rounded border p-2 ${!isOptional && !fieldMet ? 'border-red-500' : ''}`}
                value={getNestedObject(value, path ? `${path}.${key}` : key).result}
                onChange={(e) => onChange(path ? `${path}.${key}` : key, e.target.value)}
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
      })}
    </>
  )
}

export default GraphMappingSettings
