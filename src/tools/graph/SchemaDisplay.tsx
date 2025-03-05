import { useHookstate } from '@hookstate/core'
import { getNestedObject, NO_PROXY, setNestedObject } from '@ir-engine/hyperflux'
import { Button } from '@ir-engine/ui'
import React, { useEffect } from 'react'
import { JSONPreview } from './components/JSONPreview'
import { JSONSchema } from './functions/generateJsonSchema'

/**
 * Recursively flattens a JSONSchema so that nested properties are represented
 * with period-separated keys.
 *
 * When encountering an array-of-arrays, if sample data is provided and every sub-array
 * has the same length, it will flatten the inner array so that each index becomes
 * a selectable field (using the index as part of the period-separated key).
 *
 * @param schema - The JSON Schema to flatten.
 * @param prefix - The current prefix (used during recursion).
 * @param sampleData - Optional sample data to help determine fixed lengths.
 * @returns An object whose keys are period-separated field paths, and whose values are the corresponding JSONSchema.
 */
export function flattenSchema(
  schema: JSONSchema,
  prefix: string = '',
  sampleData?: any
): { [key: string]: JSONSchema } {
  let result: { [key: string]: JSONSchema } = {}

  if (schema.type === 'object' && schema.properties) {
    for (const key in schema.properties) {
      const fullKey = prefix ? `${prefix}.${key}` : key
      const childSchema = schema.properties[key]

      // If the property is an object, recurse.
      if (childSchema.type === 'object' && childSchema.properties) {
        result = {
          ...result,
          ...flattenSchema(childSchema, fullKey, sampleData ? sampleData[key] : undefined)
        }
      }
      // For an array of objects, flatten the items.
      else if (
        childSchema.type === 'array' &&
        childSchema.items &&
        childSchema.items.type === 'object' &&
        childSchema.items.properties
      ) {
        result = {
          ...result,
          ...flattenSchema(childSchema.items, fullKey, sampleData ? sampleData[key]?.[0] : undefined)
        }
      }
      // For an array-of-arrays, try to infer a fixed length from sample data.
      else if (childSchema.type === 'array' && childSchema.items && childSchema.items.type === 'array') {
        let fixedLength: number | null = null
        // If sample data is available for this property and is an array...
        if (sampleData && Array.isArray(sampleData[key])) {
          const arr = sampleData[key]
          // Filter out elements that are arrays.
          const subArrays = arr.filter((x: any) => Array.isArray(x))
          if (subArrays.length > 0) {
            const firstLength = subArrays[0].length
            // Check if every sub-array has the same length.
            const allSame = subArrays.every((sub: any) => sub.length === firstLength)
            if (allSame) {
              fixedLength = firstLength
            }
          }
        }
        if (fixedLength !== null && childSchema.items.items) {
          // For each index in the fixed-length sub-arrays, flatten the inner schema.
          for (let i = 0; i < fixedLength; i++) {
            const newPrefix = `${fullKey}.${i}`
            // Pass the corresponding sample data (if available) for this index.
            const sampleForIndex = sampleData && Array.isArray(sampleData[key]) ? sampleData[key][i] : undefined
            result = {
              ...result,
              ...flattenSchema(childSchema.items.items, newPrefix, sampleForIndex)
            }
          }
        } else {
          // If we can’t infer a fixed length, fall back to flattening the array normally.
          result = {
            ...result,
            ...flattenSchema(childSchema.items, fullKey, sampleData ? sampleData[key] : undefined)
          }
        }
      }
      // For a regular array (non-array-of-arrays), flatten the items.
      else if (childSchema.type === 'array' && childSchema.items) {
        result = {
          ...result,
          ...flattenSchema(childSchema.items, fullKey, sampleData ? sampleData[key] : undefined)
        }
      }
      // Base case: a primitive value.
      else {
        result[fullKey] = childSchema
      }
    }
  } else if (schema.type === 'array' && schema.items) {
    // If the schema itself is an array, try to flatten its items.
    if (schema.items.type === 'array') {
      let fixedLength: number | null = null
      if (sampleData && Array.isArray(sampleData)) {
        const subArrays = sampleData.filter((x: any) => Array.isArray(x))
        if (subArrays.length > 0) {
          const firstLength = subArrays[0].length
          const allSame = subArrays.every((sub: any) => sub.length === firstLength)
          if (allSame) fixedLength = firstLength
        }
      }
      if (fixedLength !== null && schema.items.items) {
        for (let i = 0; i < fixedLength; i++) {
          const newPrefix = prefix ? `${prefix}.${i}` : `${i}`
          result = {
            ...result,
            ...flattenSchema(
              schema.items.items,
              newPrefix,
              sampleData && Array.isArray(sampleData) ? sampleData[i] : undefined
            )
          }
        }
      } else {
        result = { ...result, ...flattenSchema(schema.items, prefix, sampleData) }
      }
    } else {
      result = { ...result, ...flattenSchema(schema.items, prefix, sampleData) }
    }
  } else {
    if (prefix) {
      result[prefix] = schema
    }
  }
  return result
}

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

const getRequirements = (schema: JSONSchema, path: string): string[] => {
  let result: string[] = []
  if (schema.optional) return result
  if (schema.type === 'object' && schema.properties) {
    for (const key in schema.properties) {
      const childSchema = schema.properties[key]
      if (childSchema.optional) continue
      if (childSchema.type === 'object' && childSchema.properties) {
        result = [...result, ...getRequirements(childSchema, path ? `${path}.${key}` : key)]
      } else if (childSchema.type === 'array' && childSchema.items && childSchema.items.type === 'object') {
        result = [...result, ...getRequirements(childSchema.items, path ? `${path}.${key}` : key)]
      } else {
        result.push(path ? `${path}.${key}` : key)
      }
    }
  } else if (schema.type === 'array' && schema.items) {
    if (schema.items.type === 'array') {
      result.push(path)
    } else {
      result.push(path)
    }
  } else {
    result.push(path)
  }
  return result
}

const getNestedObjectIgnoringArrays = (obj: any, path: string): any => {
  const parts = path.split('.')
  let result = obj
  for (const part of parts) {
    if (result[part] === undefined) {
      return
    }
    if (Array.isArray(result[part])) {
      result = result[part][0]
      continue
    }
    result = result[part]
  }
  return result
}

const allRequirementsMet = (schema: JSONSchema, mapping: any): boolean => {
  const requirements = getRequirements(schema, '')
  return requirements.every((req) => !!getNestedObjectIgnoringArrays(mapping, req))
}

export interface GraphMappingSettingsProps {
  jsonSchema: JSONSchema
  targetSchemas: Array<{ value: JSONSchema; label: string }>
  data: any
  onChange: (mapping: any) => void
  onConfirm: () => void
}

const GraphMappingSettings: React.FC<GraphMappingSettingsProps> = ({
  jsonSchema,
  targetSchemas,
  data,
  onChange,
  onConfirm
}) => {
  // Global visualization type state.
  const visualizationType = useHookstate(0)
  const currentSchema = targetSchemas[visualizationType.get()].value
  // Our flattened schema.
  const flattenedFields = jsonSchema?.items?.properties ? flattenSchema(jsonSchema.items, '', data) : {}

  // Build options for the dropdown from the flattened fields.
  const fieldOptions = Object.keys(flattenedFields).map((key) => ({
    value: key,
    label: key
  }))
  // Add an empty option.
  fieldOptions.unshift({ value: '', label: 'None' })

  // Graph mapping state.
  const graphMappingState = useHookstate<any>(() => buildEmptyStructureFromSchema(currentSchema))

  useEffect(() => {
    onChange(graphMappingState.get(NO_PROXY))
  }, [graphMappingState])

  const updateMapping = (path: string, newValue: string) => {
    const currentState = structuredClone(graphMappingState.get(NO_PROXY))
    setNestedObject(currentState, path, newValue)
    graphMappingState.merge(currentState)
  }

  return (
    <div className="6xl mx-auto p-4">
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
              schema={currentSchema}
              options={fieldOptions}
              path=""
              onChange={updateMapping}
              value={graphMappingState.get()}
            />
          </tbody>
        </table>
      </div>
      {currentSchema && <JSONPreview json={graphMappingState.get(NO_PROXY)} />}
      {allRequirementsMet(currentSchema, graphMappingState.get(NO_PROXY)) && (
        <Button className="pointer-events-auto z-10 mb-1 p-4" variant="tertiary" onClick={onConfirm}>
          Confirm
        </Button>
      )}
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
