import { FeathersApplication, FeathersService } from '@feathersjs/feathers'
import { ServiceTypes } from '@ir-engine/common/declarations'
import { EventDispatcher } from '@ir-engine/hyperflux'

export const createAd4mAPIAdapter = () => {
  const eventDispatcher = new EventDispatcher()

  const services = {} as Record<keyof ServiceTypes, FeathersService<any, ServiceTypes>>

  const unimplementedService = {
    find: (...args) => {
      return new Promise((resolve) => {
        resolve(
          JSON.parse(
            JSON.stringify({
              data: [],
              limit: 10,
              skip: 0,
              total: 0
            })
          )
        )
      })
    },
    get: (id) => {
      return new Promise((resolve) => {
        resolve(null)
      })
    },
    create: (...args) => {},
    update: (...args) => {},
    patch: (...args) => {},
    remove: (...args) => {},
    on: (serviceName, cb) => {
      eventDispatcher.addEventListener(serviceName as string, cb)
      return unimplementedService
    },
    off: (serviceName, cb) => {
      eventDispatcher.removeEventListener(serviceName as string, cb)
      return unimplementedService
    }
  }

  return {
    service: (path: string) => {
      return path in services ? services[path] : unimplementedService
    }
  } as FeathersApplication<ServiceTypes>
}
