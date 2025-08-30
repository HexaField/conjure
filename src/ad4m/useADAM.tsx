import { Ad4mClient, Agent, Link, LinkMutations, Literal } from '@coasys/ad4m'
import Ad4mConnectUI, { Ad4mConnectElement, getAd4mClient } from '@coasys/ad4m-connect'
import { defineState, getMutableState, getState, useHookstate, useMutableState } from '@ir-engine/hyperflux'
import { useEffect } from 'react'
import { CRUD_API, P2P_API } from '../api/CRUD'

export const blobToDataURL = (blob: Blob): Promise<string> => {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const base64 = result.split(',')[1]
      resolve(base64 as string)
    }
    reader.onerror = () => reject(reader.error)
    reader.onabort = () => reject(new Error('Read aborted'))
    reader.readAsDataURL(blob)
  })
}

export const dataURLToBlob = (dataURL: string): Promise<Blob> => {
  return new Promise<Blob>((resolve, reject) => {
    const arr = dataURL.split(',')
    const mime = arr[0].match(/:(.*?);/)?.[1]
    const bstr = atob(arr[1])
    let n = bstr.length
    const u8arr = new Uint8Array(n)
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n)
    }
    resolve(new Blob([u8arr], { type: mime }))
  })
}

export const AdamClientState = defineState({
  name: 'hexafield.adam-template.AdamClientState',
  initial: null as Ad4mClient | null,
  reactor: () => {
    const ad4mConnect = useHookstate(() => {
      return Ad4mConnectUI({
        appName: 'Conjure',
        appDesc: 'Immersive Collaboration',
        appUrl: window.location.origin,
        appDomain: window.location.origin,
        appIconPath: window.location.origin + '/icon.png',
        // domain: process.env.BASE_URL
        capabilities: [{ with: { domain: '*', pointers: ['*'] }, can: ['*'] }],
        hosting: false,
        mobile: true
      })
    }).value as Ad4mConnectElement

    const authenticatedState = useHookstate(false)

    useEffect(() => {
      ad4mConnect.style.pointerEvents = 'all'

      ad4mConnect.isAuthenticated().then((authenticated) => {
        authenticatedState.set(authenticated)
      })
    }, [])

    const authState = useHookstate(ad4mConnect.authState)

    useEffect(() => {
      getAd4mClient().then((client) => {
        getMutableState(AdamClientState).set(client)
      })

      const onAuthStateChange = (e) => {
        const oldState = authState.value
        authState.set(ad4mConnect.authState)
        console.log('auth state changed', e, ad4mConnect.authState)
        if (ad4mConnect.authState === 'authenticated' && oldState !== 'authenticated') {
          // window.location.reload()
        }
      }

      ad4mConnect.addEventListener('authstatechange', onAuthStateChange)

      return () => {
        ad4mConnect.removeEventListener('authstatechange', onAuthStateChange)
      }
    }, [authenticatedState.value])

    return null
  }
})

export const AgentState = defineState({
  name: 'hexafield.adam-template.AgentState',
  initial: null as Agent | null,
  reactor: () => {
    const adam = useMutableState(AdamClientState).value

    useEffect(() => {
      if (!adam) return

      adam.agent.me().then((response) => {
        getMutableState(AgentState).set(response)
        P2P_API.client = AgentBlobAPI
        getMutableState(P2P_API).ready.set(true)
      })
    }, [adam])
  }
})

export const AgentBlobAPI: CRUD_API = {
  create: async (args) => {
    const client = getState(AdamClientState)
    if (!client) throw new Error('AD4M client not initialized')

    const newLink = new Link({
      source: args.source,
      predicate: args.predicate,
      target: Literal.from(args.target).toUrl()
    })

    await client.agent.mutatePublicPerspective({
      additions: [newLink],
      removals: []
    } as LinkMutations)
  },

  has: async (args) => {
    const client = getState(AdamClientState)
    if (!client) throw new Error('AD4M client not initialized')

    const myPerspectives = await client.agent.me()
    if (!myPerspectives) throw new Error('Agent not initialized')

    const myLinks = myPerspectives.perspective!.links

    const link = myLinks.find((link) => link.data.source === args.source && link.data.predicate === args.predicate)
    return !!link
  },

  get: async (args) => {
    const client = getState(AdamClientState)
    if (!client) throw new Error('AD4M client not initialized')

    const myPerspectives = await client.agent.me()
    if (!myPerspectives) throw new Error('Agent not initialized')

    const myLinks = myPerspectives.perspective!.links

    const link = myLinks.find((link) => link.data.source === args.source && link.data.predicate === args.predicate)
    if (!link) return undefined // not found

    return Literal.fromUrl(link.data.target).get()
  },

  find: async (args) => {
    const client = getState(AdamClientState)
    if (!client) throw new Error('AD4M client not initialized')

    const myPerspectives = await client.agent.me()
    if (!myPerspectives) throw new Error('Agent not initialized')

    const myLinks = myPerspectives.perspective!.links

    const foundLinks = myLinks.filter((link) => link.data.predicate === args.predicate)
    return foundLinks.map((link) => link.data.source)
  },

  replace: async (args) => {
    const client = getState(AdamClientState)
    if (!client) throw new Error('AD4M client not initialized')

    const myPerspectives = await client.agent.me()
    if (!myPerspectives) throw new Error('Agent not initialized')

    const myLinks = myPerspectives.perspective!.links

    const currentLink = myLinks.find(
      (link) => link.data.source === args.source && link.data.predicate === args.predicate
    )
    if (!currentLink) throw new Error('Current link not found')

    const removals = [currentLink]

    const newLink = new Link({
      source: args.source,
      predicate: args.predicate,
      target: Literal.from(args.target).toUrl()
    })

    await client.agent.mutatePublicPerspective({
      additions: [newLink],
      removals: removals
    })
  },

  delete: async (args) => {
    const client = getState(AdamClientState)
    if (!client) throw new Error('AD4M client not initialized')

    const myPerspectives = await client.agent.me()
    if (!myPerspectives) throw new Error('Agent not initialized')

    const myLinks = myPerspectives.perspective!.links

    const currentLink = myLinks.find(
      (link) => link.data.source === args.source && link.data.predicate === args.predicate
    )
    if (!currentLink) throw new Error('Current link not found')

    await client.agent.mutatePublicPerspective({
      additions: [],
      removals: [currentLink]
    })
  }
}

globalThis.AdamClientState = AdamClientState
globalThis.AgentState = AgentState
globalThis.AgentBlobAPI = AgentBlobAPI

// wipe data: `AgentBlobAPI.find({ predicate: 'conjure://schema' }).then(sources => sources.forEach(source => AgentBlobAPI.delete({ source, predicate: 'conjure://schema' })))`
