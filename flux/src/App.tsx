import { PerspectiveProxy } from '@coasys/ad4m'
import { AgentClient } from '@coasys/ad4m/lib/src/agent/AgentClient'
import { Profile } from '@coasys/flux-types'
import { EngineState } from '@ir-engine/ecs'
import { createHyperStore, getMutableState, useMutableState, UserID } from '@ir-engine/hyperflux'
import { ReferenceSpaceState } from '@ir-engine/spatial'
import { useSpatialEngine } from '@ir-engine/spatial/src/initializeEngine'
import { useEngineCanvas } from '@ir-engine/spatial/src/renderer/functions/useEngineCanvas'
import { useEffect, useRef, useState } from 'react'
import { useBasicScene } from '../../src/world/BasicScene'
import { useSpawnAvatar } from '../../src/world/useSpawnAvatar'

createHyperStore()

type Props = {
  agent: AgentClient
  perspective: PerspectiveProxy
  source: string
  threaded: string
  element: HTMLElement
  getProfile: (did: string) => Promise<Profile>
}

const Scene = (props: { url: string }) => {
  useBasicScene(props.url)
  useSpawnAvatar(props.url)
  return null
}

const Engine = (props: Props) => {
  const ref = useRef()

  useSpatialEngine()
  useEngineCanvas(ref)

  const viewerEntity = useMutableState(ReferenceSpaceState).viewerEntity.value

  return (
    <>
      <div style={{ width: '100%', height: '100%', position: 'absolute' }} />
      <div>{viewerEntity && <Scene url={props.perspective.sharedUrl} />}</div>
    </>
  )
}

export default function App({ agent, perspective, source, threaded, element, getProfile }: Props) {
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
      {ready && (
        <Engine
          element={element}
          agent={agent}
          perspective={perspective}
          source={source}
          threaded={threaded}
          getProfile={getProfile}
        />
      )}
    </div>
  )
}
