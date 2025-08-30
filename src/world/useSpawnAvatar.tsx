import { EngineState, EntityID, SourceID, UUIDComponent } from '@ir-engine/ecs'
import { AvatarNetworkAction } from '@ir-engine/engine/src/avatar/state/AvatarNetworkActions'
import { dispatchAction, getState } from '@ir-engine/hyperflux'
import { DomainConfigState } from '@ir-engine/spatial/src/resources/DomainConfigState'
import { useEffect } from 'react'

import '@ir-engine/engine/src/avatar/AvatarModule'
import { AvatarComponent } from '@ir-engine/engine/src/avatar/components/AvatarComponent'

export const useSpawnAvatar = (sceneID: string) => {
  useEffect(() => {
    dispatchAction(
      AvatarNetworkAction.spawn({
        parentUUID: UUIDComponent.join({ entitySourceID: 'root' as SourceID, entityID: sceneID as EntityID }),
        avatarURL:
          getState(DomainConfigState).cloudDomain +
          '/projects/enchantmentengine/default-project/assets/avatars/irRobot.vrm',
        entitySourceID: getState(EngineState).userID as string as SourceID,
        entityID: AvatarComponent.entityID,
        name: 'My Avatar' /** @todo get name, maybe from flux? */
      })
    )
  }, [])

  return null
}
