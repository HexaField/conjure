import '@ir-engine/client/src/engine'
import '@ir-engine/engine'

import Debug from '@ir-engine/client-core/src/components/Debug'
import { getMutableState, useMutableState, useReactiveRef, UserID } from '@ir-engine/hyperflux'
import { useSpatialEngine } from '@ir-engine/spatial/src/initializeEngine'
import { useEngineCanvas } from '@ir-engine/spatial/src/renderer/functions/useEngineCanvas'

import { MediaIconsBox } from '@ir-engine/client-core/src/components/MediaIconsBox'
import { VideoWindows } from '@ir-engine/client-core/src/user/VideoWindows'
import config from '@ir-engine/common/src/config'
import { EngineState } from '@ir-engine/ecs'
import { DomainConfigState } from '@ir-engine/engine/src/assets/state/DomainConfigState'
import { MediaSettingsState } from '@ir-engine/engine/src/audio/MediaSettingsState'
import { NetworkState } from '@ir-engine/network'
import React, { useEffect } from 'react'
import { AgentState } from './ad4m/useADAM'
import { NeighbourhoodNetworkState } from './ad4m/useNeighbourhoodNetwork'

import { LocationState } from '@ir-engine/client-core/src/social/services/LocationService'
import '@ir-engine/client-core/src/systems/AvatarUISystem'
import { AudioState } from '@ir-engine/engine/src/audio/AudioState'
import NeighbourhoodBubbles from './world/NeighbourhoodBubbles'
import './world/NeighbourhoodWorldSystem'

//@ts-ignore
const baseURL = import.meta.env.BASE_URL

const domain = baseURL === '/' ? config.client.clientUrl : baseURL.slice(0, -1)

getMutableState(DomainConfigState).publicDomain.set(domain)
getMutableState(DomainConfigState).cloudDomain.set(domain)

export default function Template() {
  const [ref, setRef] = useReactiveRef()

  useSpatialEngine()
  useEngineCanvas(ref)

  useEffect(() => {
    config.client.fileServer = domain
    getMutableState(AudioState).positionalMedia.set(true)
    getMutableState(MediaSettingsState).immersiveMedia.set(true)
    getMutableState(NetworkState).config.merge({
      world: true,
      media: true
    })

    getMutableState(LocationState).currentLocation.location.locationSetting.videoEnabled.set(true)
    getMutableState(LocationState).currentLocation.location.locationSetting.audioEnabled.set(true)
    getMutableState(LocationState).currentLocation.location.locationSetting.screenSharingEnabled.set(true)
  }, [])

  const agent = useMutableState(AgentState).value

  useEffect(() => {
    if (!agent) return
    getMutableState(EngineState).userID.set(agent.did as UserID)
  }, [agent?.did])

  const activeNeightbourhood = useMutableState(NeighbourhoodNetworkState).value.length > 0

  return (
    <>
      <div ref={setRef} style={{ width: '100%', height: '100%', position: 'absolute' }} />
      <Debug />
      {activeNeightbourhood ? null : agent ? <NeighbourhoodBubbles /> : <h1>Connecting...</h1>}
      {activeNeightbourhood && <Media />}
    </>
  )
}

const Media = () => {
  return (
    <>
      <div className="relative h-dvh w-full p-6">
        <div className="pointer-events-auto absolute left-0 top-0 h-fit w-full pt-[inherit]">
          <MediaIconsBox />
        </div>
        <div className="pointer-events-auto absolute left-0 top-0 pl-[inherit] pt-[inherit]">
          <VideoWindows />
        </div>
        <div className="pointer-events-auto absolute right-0 top-0 h-fit w-1/4">
          <LeaveWorldButton />
        </div>
      </div>
    </>
  )
}

const LeaveWorldButton = () => {
  const leaveWorld = () => {
    const url = new URL(window.location.href)
    url.searchParams.delete('neighbourhood')
    url.search = url.searchParams.toString()
    window.history.replaceState({}, '', url.toString())
    getMutableState(NeighbourhoodNetworkState).set([])
  }

  return (
    <button
      onClick={leaveWorld}
      className="pointer-events-auto absolute right-2.5 top-2.5 flex h-auto w-auto cursor-pointer items-center justify-center rounded-full border-none bg-red-500 px-4 py-2 text-white"
    >
      Leave World
    </button>
  )
}
