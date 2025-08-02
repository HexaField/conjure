import { ForceGraphSchema } from './graph/forcegraph/ForceGraph'
import { JSONSchemaType } from './json-schema/JSONSchema'

/** @todo proper schema registry */
export const TargetSchemas = [ForceGraphSchema.value] as JSONSchemaType<any>[]
