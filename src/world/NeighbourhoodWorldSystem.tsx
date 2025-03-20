import { defineSystem, PresentationSystemGroup } from '@ir-engine/ecs'
import { useHookstate, useMutableState } from '@ir-engine/hyperflux'
import { NetworkState, NetworkTopics } from '@ir-engine/network'
import React from 'react'
import { NeighbourhoodNetworkState } from '../ad4m/NeighbourhoodNetworkTransport'
import { useBasicScene } from './BasicScene'
import { useSpawnAvatar } from './useSpawnAvatar'

export const NeighbourhoodWorldSystem = defineSystem({
  uuid: 'hexafield.conjure.NeighbourhoodWorldSystem',
  insert: { after: PresentationSystemGroup },
  reactor: () => {
    const neighbourhoods = useMutableState(NeighbourhoodNetworkState).value
    const worldState = useHookstate(NetworkState.worldNetworkState).value
    if (!worldState?.ready) return null
    return (
      <>
        {neighbourhoods
          .filter((n) => n.topic === NetworkTopics.world)
          .map((neighbourhood) => (
            <NeighbourhoodWorldReactor key={neighbourhood.networkID} sharedUrl={neighbourhood.networkID} />
          ))}
      </>
    )
  }
})

const NeighbourhoodWorldReactor = (props: { sharedUrl: string }) => {
  useBasicScene(props.sharedUrl)
  useSpawnAvatar(props.sharedUrl)

  return null
}
