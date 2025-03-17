import { Ad4mClient, Agent } from '@coasys/ad4m'
import Ad4mConnectUI, { Ad4mConnectElement, getAd4mClient } from '@coasys/ad4m-connect'
import { defineState, getMutableState, useHookstate, useMutableState } from '@ir-engine/hyperflux'
import { useEffect } from 'react'

export const AdamClientState = defineState({
  name: 'hexafield.adam-template.AdamClientState',
  initial: null as Ad4mClient | null,
  reactor: () => {
    const ad4mConnect = useHookstate(() => {
      return Ad4mConnectUI({
        appName: 'iR Engine',
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

        if (authenticated) return

        const oldState = ad4mConnect.authState

        const onAuthStateChange = (e) => {
          if (ad4mConnect.authState === 'authenticated' && oldState !== 'authenticated') {
            authenticatedState.set(true)
            ad4mConnect.removeEventListener('authstatechange', onAuthStateChange)
          }
        }

        ad4mConnect.addEventListener('authstatechange', onAuthStateChange)
      })
    }, [])

    useEffect(() => {
      if (!authenticatedState.value) return
      getAd4mClient().then((client) => {
        getMutableState(AdamClientState).set(client)
      })
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
      })
    }, [adam])
  }
})
