// tslint:disable:ordered-imports

import '@ir-engine/engine'

import { startTimer } from '@ir-engine/spatial/src/startTimer'

import { PerspectiveProxy } from '@coasys/ad4m'
import { AgentClient } from '@coasys/ad4m/lib/src/agent/AgentClient'
import { createEngine, EngineState } from '@ir-engine/ecs'
import { getMutableState, useMutableState, type UserID } from '@ir-engine/hyperflux'
import { ReferenceSpaceState } from '@ir-engine/spatial'
import { useSpatialEngine } from '@ir-engine/spatial/src/initializeEngine'
import { useEngineCanvas } from '@ir-engine/spatial/src/renderer/functions/useEngineCanvas'
import React, { useEffect, useRef, useState } from 'react'

import { useBasicScene } from '../../src/world/BasicScene'
import { useSpawnAvatar } from '../../src/world/useSpawnAvatar'

createEngine()
startTimer()

type Props = {
  agent: AgentClient
  perspective: PerspectiveProxy
  source: string
}

const Scene = (props: { url: string }) => {
  useBasicScene(props.url)
  useSpawnAvatar(props.url)
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
      <div>{viewerEntity && <Scene url={props.perspective.sharedUrl!} />}</div>
    </>
  )
}

export default function App({ agent, perspective, source }: Props) {
  console.log({ agent, perspective, source })
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
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
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
      {ready && <Engine agent={agent} perspective={perspective} source={source} />}
    </div>
  )
}
