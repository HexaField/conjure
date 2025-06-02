import type { JSONSchemaType } from './JSONSchema'

export const createJSONTransformFunctionPrompt = (props: {
  inputSchema: JSONSchemaType<any>
  outputSchema: JSONSchemaType<any>
  additionalInstructions?: string
}) => {
  const basePrompt = `Please respond with valid javascript that implements a function to transform data compliant to the input schema to data compliant to the output schema.

Input Schema: ${JSON.stringify(props.inputSchema, null, 2)}

Output Schema: ${JSON.stringify(props.outputSchema, null, 2)}`

  const additionalSection = props.additionalInstructions?.trim()
    ? `\n\nAdditional Requirements:\n${props.additionalInstructions.trim()}`
    : ''

  const endingInstructions = `\n\nYour response must be a valid javascript synchronous pure function named 'transformData', taking exactly one argument (the input data) that returns the output data.

The input data may have multiple sources, in which case they must be combined.
Ignore any data that is not included in the output. 
Make sure property names that include spaces are properly getted with quotes: \`myobj["Property with spaces"]\` instead of \`myobj.Property with spaces\`.

The response must NOT have any additional text or formatting, just the function as valid javascript code.`

  return basePrompt + additionalSection + endingInstructions
}
