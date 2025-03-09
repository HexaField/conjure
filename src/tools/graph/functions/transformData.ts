import { getNestedObject } from '@ir-engine/hyperflux'
import * as jsonTransform from 'json-transforms'

/**
 * @todo adopt JSON Path
 * - https://www.ietf.org/archive/id/draft-goessner-dispatch-jsonpath-00.html
 * - https://www.npmjs.com/package/jsonpath
 */

/**
 * uses json-transforms to transform data with provided mapping
 * @param jsonRules
 * @param inputData
 */
export const transformData = (jsonRules: any, inputData: any) => {
  const rootProperties = {} as any

  for (const [propertyName, ruleDefinitions] of Object.entries(jsonRules)) {
    const isArrayOfRules = Array.isArray(ruleDefinitions)
    if (isArrayOfRules && ruleDefinitions.length === 1) {
      const ruleDefinition = ruleDefinitions[0]
      const rules = Object.entries(ruleDefinition) as [string, string][]
      // for now, assume that the first path of the first rule is the root
      const ruleParts = rules[0][1].split('.')
      // returns the first index of the property in the input data that is an array
      const findRuleIndex = (ruleParts: string[]) => {
        let ruleArrayIndex = -1
        for (let i = 0; i < ruleParts.length; i++) {
          const dataPart = getNestedObject(inputData, ruleParts.slice(0, i).join('.')).result
          if (!dataPart) {
            continue
          }
          if (Array.isArray(dataPart) && dataPart.length > 1) {
            ruleArrayIndex = i
            break
          }
        }
        return ruleArrayIndex
      }
      const ruleArrayIndex = findRuleIndex(ruleParts)
      // replace '0' with '' to get the root path of an array with a single element
      const rulesRoot = ruleParts.slice(0, ruleArrayIndex).join('.').replace('0', '')
      const rulePaths = rules
        .filter(([outputPath, inputPath]) => !!outputPath && !!inputPath)
        .map(([outputPath, inputPath]) => [outputPath, inputPath.split('.').slice(ruleArrayIndex).join('.')])
      // // create a runner for the array
      const pathRule = jsonTransform.pathRule('.' + rulesRoot, (d) => {
        return d.runner()
      })
      // create the object rule
      const objectRule = jsonTransform.pathRule('.', (d) =>
        Object.fromEntries(
          rulePaths.map(([outputPath, inputPath]) => [outputPath, getNestedObject(d.context, inputPath).result])
        )
      )
      rootProperties[propertyName] = [pathRule, objectRule]
    } else {
      // todo: handle object rules
    }
  }

  const transformedData = Object.fromEntries(
    Object.entries(rootProperties)
      .map(([prompt, rule]) => [prompt, jsonTransform.transform(inputData, rule)])
      .filter(([prompt, result]) => !!result)
  )

  return transformedData
}
