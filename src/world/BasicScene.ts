import { GLTF } from '@gltf-transform/core'
import { EntityID, getMutableComponent, setComponent, UndefinedEntity } from '@ir-engine/ecs'
import { AssetState, SceneState } from '@ir-engine/engine/src/gltf/GLTFState'
import { getMutableState, useHookstate, useMutableState } from '@ir-engine/hyperflux'
import { ReferenceSpaceState } from '@ir-engine/spatial'
import { SceneComponent } from '@ir-engine/spatial/src/renderer/components/SceneComponents'
import { RendererComponent } from '@ir-engine/spatial/src/renderer/WebGLRendererSystem'
import { useEffect } from 'react'
import { Cache } from 'three'

// create scene with a rigidbody loaded offset from the origin
const createSceneGLTF = (): GLTF.IGLTF => ({
  asset: {
    version: '2.0',
    generator: 'iR Engine'
  },
  scenes: [{ nodes: [0, 1, 2, 3, 4] }],
  scene: 0,
  nodes: [
    {
      name: 'Settings',
      extensions: {
        EE_uuid: '0d5a20e1-abe2-455e-9963-d5e1e19fca19',
        EE_fog: {
          type: 'linear',
          color: '#FFFFFF',
          density: 0.005,
          near: 1,
          far: 1000,
          timeScale: 1,
          height: 0.05
        },
        EE_render_settings: {
          primaryLight: 'cb045cfd-8daf-4a2b-b764-35625be54a11',
          csm: true,
          cascades: 3,
          toneMapping: 1,
          toneMappingExposure: 0.8,
          shadowMapType: 2
        }
      }
    },
    {
      matrix: [100, 0, 0, 0, 0, 0.1, 0, 0, 0, 0, 100, 0, 0, 0, 0, 1],
      name: 'Rigidbody',
      extensions: {
        EE_uuid: '685c48da-e2a0-4a9a-af7c-c5a3c187c99a',
        EE_rigidbody: {
          type: 'fixed'
        },
        EE_collider: {
          shape: 'box'
        }
      }
    },
    {
      matrix: [100, 0, 0, 0, 0, 0.1, 0, 0, 0, 0, 100, 0, 0, 0, 0, 1],
      name: 'Ground',
      extensions: {
        EE_uuid: '60a01f0b-52ce-4c14-9fcf-7f23aa459c71',
        EE_visible: true,
        EE_shadow: {
          cast: true,
          receive: true
        },
        EE_primitive_geometry: {
          geometryType: 0,
          geometryParams: {
            width: 1,
            height: 1,
            depth: 1
          }
        }
      }
    },
    {
      name: 'hemisphere light',
      extensions: {
        EE_uuid: 'f77dc4c6-c9a6-433d-8102-4a9a8e1c0ce9',
        EE_visible: true,
        EE_hemisphere_light: {
          skyColor: 16777215,
          groundColor: 16777215,
          intensity: 1
        }
      }
    },
    {
      matrix: [
        0.8201518642540717, 0.2860729507918132, -0.49549287218469207, 0, -2.135677357184562e-9, 0.866025399522099,
        0.5000000073825887, 0, 0.5721458901019657, -0.41007593712366663, 0.7102723465203862, 0, 0, 0, 0, 1
      ],
      name: 'directional light',
      extensions: {
        EE_uuid: 'cb045cfd-8daf-4a2b-b764-35625be54a11',
        EE_directional_light: {
          color: 16777215,
          intensity: 1,
          cameraFar: 50,
          castShadow: true,
          shadowBias: -0.00001,
          shadowRadius: 1
        },
        EE_visible: true
      }
    }
  ],
  extensionsUsed: ['EE_uuid', 'EE_visible', 'EE_rigidbody', 'EE_collider', 'EE_primitive_geometry']
})

export const useBasicScene = (sceneID: string) => {
  const gltfEntityState = useHookstate(UndefinedEntity)
  const { viewerEntity, originEntity } = useMutableState(ReferenceSpaceState).value

  useEffect(() => {
    if (!viewerEntity || !originEntity) return

    const gltf = createSceneGLTF()

    const sceneURL = `/${sceneID}.gltf`

    Cache.enabled = true
    Cache.add(sceneURL, gltf)

    const gltfEntity = AssetState.load(sceneURL, sceneID as EntityID, originEntity)
    getMutableComponent(viewerEntity, RendererComponent).scenes.merge([gltfEntity])
    setComponent(gltfEntity, SceneComponent, { active: true })
    getMutableState(SceneState)[sceneURL].set(gltfEntity)

    gltfEntityState.set(gltfEntity)

    return () => {
      gltfEntityState.set(UndefinedEntity)
      AssetState.unload(gltfEntity)
      getMutableState(SceneState)[sceneURL].set(gltfEntity)
    }
  }, [viewerEntity, originEntity])

  return gltfEntityState.value
}
