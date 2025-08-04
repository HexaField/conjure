import { EntityID, SourceID, UUIDComponent } from '@ir-engine/ecs'
import { AvatarNetworkAction } from '@ir-engine/engine/src/avatar/state/AvatarNetworkActions'
import { dispatchAction, getState } from '@ir-engine/hyperflux'
import { DomainConfigState } from '@ir-engine/spatial/src/resources/DomainConfigState'
import { useEffect } from 'react'
import { AgentState } from '../ad4m/useADAM'

import '@ir-engine/engine/src/avatar/AvatarModule'
import { AvatarComponent } from '@ir-engine/engine/src/avatar/components/AvatarComponent'

export const useSpawnAvatar = (neighbourhood: string) => {
  useEffect(() => {
    const agent = getState(AgentState)
    dispatchAction(
      AvatarNetworkAction.spawn({
        parentUUID: UUIDComponent.join({ entitySourceID: 'root' as SourceID, entityID: neighbourhood as EntityID }),
        avatarURL:
          getState(DomainConfigState).cloudDomain +
          '/projects/enchantmentengine/default-project/assets/avatars/irRobot.vrm',
        entitySourceID: agent!.did! as SourceID,
        entityID: AvatarComponent.entityID,
        name: 'My Avatar' /** @todo get name, maybe from flux? */
      })
    )
  })

  return null
}
