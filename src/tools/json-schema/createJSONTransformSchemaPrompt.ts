import type { JSONSchemaType } from './JSONSchema'

export const createJSONTransformSchemaPrompt = (props: {
  inputSchema: JSONSchemaType<any>
  outputSchema: JSONSchemaType<any>
  additionalInstructions?: string
}) => {
  const basePrompt = `Please respond with valid json that specifies a JSON Path template to transform data compliant to the input schema to data compliant to the output schema.

Input Schema: ${JSON.stringify(props.inputSchema, null, 2)}

Output Schema: ${JSON.stringify(props.outputSchema, null, 2)}`

  const additionalSection = props.additionalInstructions?.trim()
    ? `\n\nAdditional Requirements:\n${props.additionalInstructions.trim()}`
    : ''

  const endingInstructions = `\n\nYour response must compliant with the following specification.

The response must NOT have any additional text or formatting, just the template as valid JSON, as specified below:
${jsonPathReadme}
`

  return basePrompt + additionalSection + endingInstructions
}

const jsonPathReadme = `
Pulls data from an object literal using JSONPath and generate a new objects based on a template. Each of the template's properties can pull a single property from the source data or an array of all results found by its JSONPath. When pulling an array of data you can also supply a subtemplate to transform each item in the array.

Notes on special tokens in templates:
- \`$\` always refers to the ROOT of the input, regardless of depth.
- \`@\` refers to the CURRENT item/context when evaluating inside subtemplates or scripts.

## Usage

\`\`\`js
const template = {
  foo: [
    '$.some.crazy',
    {
      bar: '$.example'
    }
  ]
}

const data = {
  some: {
    crazy: [
      {
        example: 'A'
      },
      {
        example: 'B'
      }
    ]
  }
}

const result = transform(data, template)
\`\`\`

Result:

\`\`\`js
{
  foo: [
    {
      bar: 'A'
    },
    {
      bar: 'B'
    }
  ]
}
\`\`\`

## Method

\`\`\`js
jsonPathObjectTransform(data, template)
\`\`\`

Where \`data\` and \`template\` are both a plain \`Object\`. Returns the transformed \`Object\`.

## Template Objects

Your template will be an object literal that outlines what the resulting object should look like. Each property will contain a JSONPath \`String\` or \`Array\` depending on how many properties from the source data you want to assign to the generated object.

### Pulling a Single Property

\`\`\`js
{
  destination: '$.path.to.source'
}
\`\`\`

Use a \`String\` on your template property to assign a single object returned from your JSONPath. If your path returns multiple results then only the first is used.

#### Example

\`\`\`js
const template = {
  foo: '$.example'
}

const data = {
  example: 'bar'
}
\`\`\`

Result:

\`\`\`js
{
  foo: 'bar'
}
\`\`\`

### Pulling an Array of Properties

\`\`\`js
{
  destination: ['$.path.to.sources']
}
\`\`\`

Use an \`Array\` containing a single \`String\` to assign all results returned from your JSONPath.

#### Example

\`\`\`js
const tempalte = {
  foo: ['$..example']
}

const data = {
  a: {
    example: 'bar'
  },
  b: {
    example: 'baz'
  }
}
\`\`\`

Result:

\`\`\`js
{
  foo: ['bar', 'baz']
}
\`\`\`

### Transform Items Returned in Array

\`\`\`js
{
  destination: ['$.path.to.sources', { item: '$.item.path' }]
}
\`\`\`

Use an \`Array\` with a \`String\` and an \`Object\` to assign all results returned from your JSONPath and transform each of the objects with a subtemplate. Inside the subtemplate, use \`@\` to access the current item; use \`$\` to access the root.

#### Example

\`\`\`js
const template = {
  foo: ['$.a, $.b..example', {
    bar: '@.demo'
  }]
}

const data = {
  a: {
    example: {
      demo: 'baz'
    }
  },
  b: {
    example: {
      demo: 'qux'
    }
  }
}
\`\`\`

Result:

\`\`\`js
{
  foo: [{ bar: 'baz' }, { bar: 'qux' }]
}
\`\`\`
`
