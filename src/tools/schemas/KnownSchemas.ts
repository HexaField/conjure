import { JSONSchemaType } from '../json-schema/JSONSchema'
import { SchemaRegistry } from '../registries/SchemaRegistry'
import KumuLimicon2024 from './limicon_2024.json'
import KumuLimicon2025 from './limicon_2025.json'
import MurmurationsOrganizationsV1_0_0 from './organizations_schema-v1.0.0.json'
import MurmurationsPeopleV0_1_0 from './people_schema-v0.1.0.json'

export function registerKnownSchemas() {
  SchemaRegistry.register(
    MurmurationsOrganizationsV1_0_0 as JSONSchemaType<any>,
    'Murmurations - Organizations',
    MurmurationsOrganizationsV1_0_0.description
  )
  SchemaRegistry.register(
    MurmurationsPeopleV0_1_0 as JSONSchemaType<any>,
    'Murmurations - People',
    MurmurationsPeopleV0_1_0.description
  )
  SchemaRegistry.register(KumuLimicon2024 as JSONSchemaType<any>, 'Kumu - Limicon 2024', 'Limicon 2024')
  SchemaRegistry.register(KumuLimicon2025 as JSONSchemaType<any>, 'Kumu - Limicon 2025', 'Limicon 2025')
}
