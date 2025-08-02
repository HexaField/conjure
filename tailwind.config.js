import tailwindConfig from '../../../../../tailwind.config'

const newConfig = structuredClone(tailwindConfig)
newConfig.content = newConfig.content.map((a) => a.replace('../', '../../../../'))

module.exports = {
  ...newConfig
}
