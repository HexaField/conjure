// tslint:disable:ordered-imports

import '@ir-engine/engine'

import { startTimer } from '@ir-engine/spatial/src/startTimer'

import { PerspectiveProxy } from '@coasys/ad4m'
import { AgentClient } from '@coasys/ad4m/lib/src/agent/AgentClient'
import {
  createEngine,
  EngineState,
  EntityID,
  getComponent,
  setComponent,
  SourceID,
  UUIDComponent
} from '@ir-engine/ecs'
import { dispatchAction, getMutableState, getState, useMutableState, type UserID } from '@ir-engine/hyperflux'
import { ReferenceSpaceState, TransformComponent } from '@ir-engine/spatial'
import { useSpatialEngine } from '@ir-engine/spatial/src/initializeEngine'
import { useEngineCanvas } from '@ir-engine/spatial/src/renderer/functions/useEngineCanvas'
import React, { useEffect, useRef, useState } from 'react'
import { SceneState } from '@ir-engine/engine/src/gltf/GLTFState'
import { LocationState } from '@ir-engine/client-core/src/social/services/LocationService'
import { SpectateActions } from '@ir-engine/spatial/src/camera/systems/SpectateSystem'

import { useTestScene } from '../../src/world/TestScene'
import { CameraOrbitComponent } from '@ir-engine/spatial/src/camera/components/CameraOrbitComponent'
import { InputComponent } from '@ir-engine/spatial/src/input/components/InputComponent'
import { Box3, Vector3 } from 'three'
// import { useBasicScene } from '../../src/world/BasicScene'
// import { useSpawnAvatar } from '../../src/world/useSpawnAvatar'

createEngine()
startTimer()

type Props = {
  agent: AgentClient
  perspective: PerspectiveProxy
  source: string
}

const Scene = (props: { url: string }) => {
  useTestScene(props.url)
  // useBasicScene(props.url)
  // useSpawnAvatar(props.url)
  useEffect(() => {
    const viewer = getState(ReferenceSpaceState).viewerEntity
    setComponent(viewer, CameraOrbitComponent)
    setComponent(viewer, InputComponent)

    const transform = getComponent(viewer, TransformComponent)
    transform.rotation.setFromAxisAngle(new Vector3(0, 1, 0), -Math.PI / 2)

    CameraOrbitComponent.setFocus(
      viewer,
      new Vector3(0, 1.5, 0),
      new Box3().setFromCenterAndSize(new Vector3(0, 1.5, 0), new Vector3(3, 3, 3))
    )

    const sceneURL = `${props.url}.gltf`
    getMutableState(LocationState).currentLocation.location.sceneURL.set(sceneURL)
    return () => {
      getMutableState(LocationState).currentLocation.location.sceneURL.set('')
    }
  }, [])
  return null
}

const Engine = (props: Props) => {
  const ref = useRef(null)

  useSpatialEngine()
  useEngineCanvas(ref.current)

  const viewerEntity = useMutableState(ReferenceSpaceState).viewerEntity.value

  return (
    <>
      <div ref={ref} style={{ width: '100%', height: '100%', position: 'absolute' }} />
      {viewerEntity && <Scene url={props.perspective.sharedUrl!} />}
    </>
  )
}

export default function App({ agent, perspective, source }: Props) {
  if (!perspective?.uuid || !agent) return <div>"No perspective or agent client"</div>

  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!agent) return
    agent.me().then((me) => {
      setReady(true)
      getMutableState(EngineState).userID.set(me.did as UserID)
    })
  }, [])

  return (
    <div
      style={{
        width: '100%',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      {ready && <Engine agent={agent} perspective={perspective} source={source} />}
      <canvas
        id="engine-renderer-canvas"
        style={{
          outline: 'none',
          zIndex: 0,
          width: '100%',
          height: '100%',
          position: 'fixed',
          WebkitUserSelect: 'none',
          pointerEvents: 'auto',
          userSelect: 'none'
        }}
      />
    </div>
  )
}
