import { Literal, NeighbourhoodProxy, PerspectiveExpression } from '@coasys/ad4m'
import { PUBLIC_STUN_SERVERS } from '@ir-engine/common/src/constants/STUNServers'
import { Engine } from '@ir-engine/ecs'
import {
  MessageTypes,
  NetworkActions,
  NetworkID,
  NetworkPeerState,
  NetworkState,
  PeerID,
  RTCPeerConnectionState,
  SendMessageType,
  State,
  StunServerState,
  Topic,
  UserID,
  WebRTCPeerConnection,
  WebRTCTransportFunctions,
  defineState,
  dispatchAction,
  getMutableState,
  getState,
  joinNetwork,
  leaveNetwork,
  none,
  useHookstate,
  useMutableState
} from '@ir-engine/hyperflux'
import React, { useEffect } from 'react'
import { AgentState } from './useADAM'
import { PerspectivesState } from './usePerspectives'

const IS_ANYONE_HERE = 'conjure://is-anyone-here'
const I_AM_HERE = 'conjure://i-am-here'
const PEER_SIGNAL = 'conjure://peer-signal'
const LEAVE = 'conjure://leave'
const HEARTBEAT = 'conjure://heartbeat'

type SignalData = {
  networkID: NetworkID
  targetPeerID: PeerID
  fromPeerID: PeerID
  message: MessageTypes
}

export const NeighbourhoodNetworkState = defineState({
  name: 'hexafield.adam-template.NeighbourhoodNetworkState',
  initial: [] as Array<{ topic: Topic; sharedUrl: string }>,
  reactor: () => {
    const joinedNeighbourhoods = useMutableState(NeighbourhoodNetworkState).value

    useEffect(() => {
      /** @todo it's probably fine that we override this every time we connect to a new server, but we should maybe handle this smarter */
      getMutableState(StunServerState).set(PUBLIC_STUN_SERVERS)
    }, [])

    return (
      <>
        {joinedNeighbourhoods.map((neighbourhood) => (
          <ConnectionReactor
            key={neighbourhood.topic + '_' + neighbourhood.sharedUrl}
            sharedUrl={neighbourhood.sharedUrl}
            topic={neighbourhood.topic}
          />
        ))}
      </>
    )
  }
})

const array = new Uint32Array(1)
self.crypto.getRandomValues(array)
const myPeerIndex = array[0]

const ConnectionReactor = (props: { sharedUrl: string; topic: Topic }) => {
  const { sharedUrl, topic } = props

  useEffect(() => {
    const url = new URL(window.location.href)
    url.searchParams.set('neighbourhood', sharedUrl)
    url.search = url.searchParams.toString()
    window.history.replaceState({}, '', url.toString())
  }, [])

  const networkID = (sharedUrl + '_' + topic) as NetworkID

  const perspective = getState(PerspectivesState).neighbourhoods[sharedUrl]

  const neighbourhood = useHookstate(() => {
    return perspective.getNeighbourhoodProxy()
  }).value as NeighbourhoodProxy

  const source = sharedUrl

  const sendMessage: SendMessageType = (networkID: NetworkID, toPeerID: PeerID, message: MessageTypes) => {
    // console.log('sendMessage', networkID, toPeerID, message)
    const toAgentDID = getState(NetworkPeerState)[networkID]?.peers?.[toPeerID]?.userId
    /** @todo use sendSignalU when it is fixed */
    neighbourhood.sendBroadcastU(
      {
        links: [
          {
            source,
            predicate: PEER_SIGNAL,
            target: Literal.from({
              networkID,
              fromPeerID: HyperFlux.store.peerID,
              targetPeerID: toPeerID,
              message
            }).toUrl()
          }
        ]
      },
      true
    )
  }

  useEffect(() => {
    getMutableState(NetworkState).hostIds[topic].set(networkID)

    const network = joinNetwork(networkID, null, topic, {})

    network.ready = true

    dispatchAction(
      NetworkActions.peerJoined({
        $network: network.id,
        $topic: network.topic,
        $to: HyperFlux.store.peerID,
        peerID: HyperFlux.store.peerID,
        peerIndex: myPeerIndex,
        userID: getState(EngineState).userID
      })
    )

    const agent = getState(AgentState)!

    neighbourhood.sendBroadcastU(
      {
        links: [
          {
            source,
            predicate: IS_ANYONE_HERE,
            target: Literal.from({
              networkID,
              peerID: HyperFlux.store.peerID,
              peerIndex: myPeerIndex
            }).toUrl()
          }
        ]
      },
      true
    )

    /** @todo because of a bug in the event listener, we need to dedupe events */
    const seenMessages = new Set<string>()

    const addConnection = (userID: UserID, peerID: PeerID, peerIndex: number) => {
      otherPeers.merge([{ peerID, peerIndex, userID }])
    }

    const broadcastArrivalResponse = (toAgentID: string) => {
      /** @todo use sendSignalU when it is fixed */
      neighbourhood.sendBroadcastU(
        {
          links: [
            {
              source: source,
              predicate: I_AM_HERE,
              target: Literal.from({
                networkID,
                peerID: HyperFlux.store.peerID,
                peerIndex: myPeerIndex
              }).toUrl()
            }
          ]
        },
        true
      )
    }

    const onBroadcastReceived = (expression: PerspectiveExpression) => {
      if (seenMessages.has(expression.proof.signature)) return
      seenMessages.add(expression.proof.signature)

      const link = expression.data.links[0]
      if (link.data.source !== source) return

      const data = getExpressionData(link.data.target) as
        | SignalData
        | { peerID: PeerID; peerIndex: number; networkID: NetworkID }
      if (data.networkID && data.networkID !== networkID) return

      /** @todo use links properly to have proper type safety */
      // ignore messages from self peer, still allowing other peers for my agent
      if (
        ((data as any).peerID && (data as any).peerID === HyperFlux.store.peerID) ||
        ((data as any).fromPeerID && (data as any).fromPeerID === HyperFlux.store.peerID) ||
        (!(data as any).peerID && !(data as any).fromPeerID)
      )
        return

      if (link.data.predicate === IS_ANYONE_HERE) {
        // Check if the remote host should create the offer
        // -> If so, create passive connection
        const data = getExpressionData(link.data.target) as {
          peerID: PeerID
          peerIndex: number
          networkID: NetworkID
        }
        if (data.peerIndex < myPeerIndex) {
          addConnection(link.author, data.peerID, data.peerIndex)
        }
        broadcastArrivalResponse(link.author)
      }

      if (link.data.predicate === I_AM_HERE) {
        const data = getExpressionData(link.data.target) as { peerID: PeerID; peerIndex: number; networkID: NetworkID }
        // Check if we should create the offer
        // -> If so, create active connection
        if (data.peerIndex > myPeerIndex) {
          addConnection(link.author, data.peerID, data.peerIndex)
        } else {
          addConnection(link.author, data.peerID, data.peerIndex)
          broadcastArrivalResponse(link.author)
        }
      }

      if (link.data.predicate === PEER_SIGNAL) {
        const data = getExpressionData(link.data.target) as SignalData

        const fromAgentpeers = getState(NetworkPeerState)[networkID].users?.[link.author] ?? []
        if (!fromAgentpeers.includes(data.fromPeerID))
          console.warn('Received message from an agent about a peer who does not control it!')

        // need to ignore messages from self
        if (data.targetPeerID !== HyperFlux.store.peerID) return
        if (data.networkID !== network.id) return

        WebRTCTransportFunctions.onMessage(sendMessage, data.networkID, data.fromPeerID, data.message)
      }

      if (link.data.predicate === LEAVE) {
        const data = getExpressionData(link.data.target) as { peerID: PeerID }
        otherPeers.set((peers) => {
          return peers.filter((p) => p.peerID !== data.peerID)
        })
      }
    }

    neighbourhood.addSignalHandler(onBroadcastReceived)

    return () => {
      neighbourhood.removeSignalHandler(onBroadcastReceived)

      dispatchAction(
        NetworkActions.peerLeft({
          $network: network.id,
          $topic: network.topic,
          $to: HyperFlux.store.peerID,
          peerID: HyperFlux.store.peerID,
          userID: getState(EngineState).userID
        })
      )
      leaveNetwork(network)
      getMutableState(NetworkState).hostIds[topic].set(none)
    }
  }, [])

  const otherPeers = useHookstate<{ peerID: PeerID; peerIndex: number; userID: UserID }[]>([])

  useEffect(() => {
    const interval = setInterval(() => {
      // @todo heartbeat
    }, 1000)
    return () => {
      clearInterval(interval)
    }
  }, [])

  return (
    <>
      {otherPeers.value.map((peer) => (
        <PeerReactor
          key={peer.peerID + networkID}
          otherPeers={otherPeers}
          peerID={peer.peerID}
          peerIndex={peer.peerIndex}
          userID={peer.userID}
          networkID={networkID}
          neighbourhoodProxy={neighbourhood}
          sendMessage={sendMessage}
        />
      ))}
    </>
  )
}

const PeerReactor = (props: {
  otherPeers: State<{ peerID: PeerID; peerIndex: number; userID: UserID }[]>
  peerID: PeerID
  peerIndex: number
  userID: UserID
  networkID: NetworkID
  neighbourhoodProxy: NeighbourhoodProxy
  sendMessage: SendMessageType
}) => {
  const network = getState(NetworkState).networks[props.networkID]

  /** We need an extra custom on leave callback to clear up our own state if a peer leaves rudely */
  const peerConnectionState = useMutableState(RTCPeerConnectionState)[props.networkID][props.peerID]?.value
  const isready = peerConnectionState && peerConnectionState.ready && peerConnectionState.dataChannels['actions']

  useEffect(() => {
    if (!isready) return

    return () => {
      props.otherPeers.set((peers) => {
        return peers.filter((p) => p.peerID !== props.peerID)
      })
    }
  }, [isready])

  return (
    <WebRTCPeerConnection
      network={network}
      peerID={props.peerID}
      peerIndex={props.peerIndex}
      userID={props.userID}
      sendMessage={props.sendMessage}
      maxResolution={'hd'}
      isPiP={true}
    />
  )
}

function getExpressionData(data: any) {
  let parsedData
  try {
    parsedData = Literal.fromUrl(data).get()
  } catch (e) {
    parsedData = data
  } finally {
    return parsedData
  }
}
