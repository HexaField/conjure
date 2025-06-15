import '@ir-engine/client/src/engine'

import { getMutableState, useMutableState, useReactiveRef } from '@ir-engine/hyperflux'
import { useSpatialEngine } from '@ir-engine/spatial/src/initializeEngine'
import { useEngineCanvas } from '@ir-engine/spatial/src/renderer/functions/useEngineCanvas'

import React, { useEffect } from 'react'

import Debug from '@ir-engine/client-core/src/components/Debug'
import { createEntity, EntityTreeComponent, removeEntity, setComponent } from '@ir-engine/ecs'
import { AmbientLightComponent, ReferenceSpaceState, TransformComponent } from '@ir-engine/spatial'
import { CameraOrbitComponent } from '@ir-engine/spatial/src/camera/components/CameraOrbitComponent'
import { NameComponent } from '@ir-engine/spatial/src/common/NameComponent'
import { setVisibleComponent } from '@ir-engine/spatial/src/renderer/components/VisibleComponent'
import { RendererState } from '@ir-engine/spatial/src/renderer/RendererState'
import { Vector3 } from 'three'

import ToolMenu from './ToolMenu'

import { GithubOriginalFalse } from '@ir-engine/ui/src/icons'
import './graph/forcegraph/ForceGraph'

export default function Template() {
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
    setComponent(ambientLightEntity, EntityTreeComponent, { parentEntity: originEntity })
    setComponent(ambientLightEntity, AmbientLightComponent)
    setVisibleComponent(ambientLightEntity, true)

    return () => {
      document.body.style.backgroundColor = 'white'
      removeEntity(ambientLightEntity)
    }
  }, [originEntity, viewerEntity])

  return (
    <>
      <div ref={setRef} style={{ width: '100%', height: '100%', position: 'absolute' }} />
      <ToolMenu />
      <GithubLink />
      <Debug />
    </>
  )
}

const GithubLink = () => {
  return (
    <div className="pointer-events-auto absolute bottom-4 right-4 rounded-lg bg-black px-4 py-2 text-white">
      <a
        href="https://github.com/hexafield/conjure"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center"
      >
        <GithubOriginalFalse className="mr-2 inline-block" />
      </a>
    </div>
  )
}
