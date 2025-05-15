import '@ir-engine/client/src/engine'

import { getMutableState, useHookstate, useMutableState, useReactiveRef } from '@ir-engine/hyperflux'
import { useSpatialEngine } from '@ir-engine/spatial/src/initializeEngine'
import { useEngineCanvas } from '@ir-engine/spatial/src/renderer/functions/useEngineCanvas'

import React, { useEffect } from 'react'

import Debug from '@ir-engine/client-core/src/components/Debug'
import { createEntity, removeEntity, setComponent } from '@ir-engine/ecs'
import { AmbientLightComponent, ReferenceSpaceState, TransformComponent } from '@ir-engine/spatial'
import { CameraOrbitComponent } from '@ir-engine/spatial/src/camera/components/CameraOrbitComponent'
import { NameComponent } from '@ir-engine/spatial/src/common/NameComponent'
import { setVisibleComponent } from '@ir-engine/spatial/src/renderer/components/VisibleComponent'
import { RendererState } from '@ir-engine/spatial/src/renderer/RendererState'
import { Vector3 } from 'three'

import './forcegraph/ForceGraph'
import { ForceGraphSchema } from './forcegraph/ForceGraph'
import { DnDURLAndFileUpload } from './MappingUI'

export default function ForceGraphRaw() {
  const [ref, setRef] = useReactiveRef()

  useSpatialEngine()
  useEngineCanvas(ref)

  const { originEntity, viewerEntity } = useMutableState(ReferenceSpaceState).value

  useEffect(() => {
    if (!originEntity || !viewerEntity) return

    /** Set Up Scene */
    document.body.style.backgroundColor = 'black'
    setComponent(viewerEntity, TransformComponent, {
      position: new Vector3(10, 10, 20)
    })
    setComponent(viewerEntity, CameraOrbitComponent)
    getMutableState(RendererState).useShadows.set(false)

    const ambientLightEntity = createEntity()
    setComponent(ambientLightEntity, NameComponent, 'Ambient Light')
    setComponent(ambientLightEntity, AmbientLightComponent)
    setVisibleComponent(ambientLightEntity, true)

    return () => {
      document.body.style.backgroundColor = 'white'
      removeEntity(ambientLightEntity)
    }
  }, [originEntity, viewerEntity])

  const currentURL = useHookstate(new URLSearchParams(window.location.search).get('url') || '')

  const onChange = (url) => {
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        ForceGraphSchema.onConfirm(data)
      })
  }

  return (
    <>
      <div ref={setRef} style={{ width: '100%', height: '100%', position: 'absolute' }} />
      <DnDURLAndFileUpload selectedURL={currentURL.value} onChange={onChange} />
      <Debug />
    </>
  )
}
