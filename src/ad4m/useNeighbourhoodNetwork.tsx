import { Literal, NeighbourhoodProxy, PerspectiveExpression } from '@coasys/ad4m'
import { PUBLIC_STUN_SERVERS } from '@ir-engine/common/src/constants/STUNServers'
import { Engine } from '@ir-engine/ecs'
import {
  NetworkID,
  PeerID,
  State,
  UserID,
  defineState,
  dispatchAction,
  getMutableState,
  getState,
  none,
  useHookstate,
  useMutableState
} from '@ir-engine/hyperflux'
import {
  DataChannelRegistryState,
  DataChannelType,
  MessageTypes,
  NetworkActions,
  NetworkState,
  NetworkTopics,
  RTCPeerConnectionState,
  SendMessageType,
  StunServerState,
  WebRTCTransportFunctions,
  addNetwork,
  createNetwork,
  removeNetwork,
  useWebRTCPeerConnection
} from '@ir-engine/network'
import { decode } from 'msgpackr'
import React, { useEffect } from 'react'
import { useBasicScene } from '../world/BasicScene'
import { AgentState } from './useADAM'
import { PerspectivesState } from './usePerspectives'

const IS_ANYONE_HERE = 'is-anyone-here'
const I_AM_HERE = 'i-am-here'
const PEER_SIGNAL = 'peer-signal'
const LEAVE = 'leave'
const HEARTBEAT = 'heartbeat'

type SignalData = {
  networkID: NetworkID
  targetPeerID: PeerID
  fromPeerID: PeerID
  message: MessageTypes
}

const PeerDIDState = defineState({
  name: 'hexafield.adam-template.PeerDIDState',
  initial: {
    peersToDID: {} as Record<PeerID, string>,
    DIDToPeers: {} as Record<string, PeerID[]>
  }
})

export const NeighbourhoodNetworkState = defineState({
  name: 'hexafield.adam-template.NeighbourhoodNetworkState',
  initial: [] as string[],
  reactor: () => {
    const joinedNeighbourhoods = useMutableState(NeighbourhoodNetworkState).value

    useEffect(() => {
      /** @todo it's probably fine that we override this every time we connect to a new server, but we should maybe handle this smarter */
      getMutableState(StunServerState).set(PUBLIC_STUN_SERVERS)
    }, [])

    return (
      <>
        {joinedNeighbourhoods.map((neighbourhood) => (
          <NeighbourhoodReactor key={neighbourhood} neighbourhood={neighbourhood} />
        ))}
      </>
    )
  }
})

const NeighbourhoodReactor = (props: { neighbourhood: string }) => {
  useBasicScene(props.neighbourhood)

  return <ConnectionReactor networkID={props.neighbourhood as NetworkID} />
}

const array = new Uint32Array(1)
self.crypto.getRandomValues(array)
const myPeerIndex = array[0]

const ConnectionReactor = (props: { networkID: NetworkID }) => {
  const { networkID } = props

  const perspective = getState(PerspectivesState).neighbourhoods[networkID]

  const neighbourhood = useHookstate(() => {
    return perspective.getNeighbourhoodProxy()
  }).value as NeighbourhoodProxy

  const source = perspective.sharedUrl!

  const sendMessage: SendMessageType = (networkID: NetworkID, toPeerID: PeerID, message: MessageTypes) => {
    console.log('sendMessage', networkID, toPeerID, message)
    const toAgentDID = getState(PeerDIDState).peersToDID[toPeerID]
    /** @todo use sendSignalU when it is fixed */
    neighbourhood.sendBroadcastU({
      links: [
        {
          source,
          predicate: PEER_SIGNAL,
          target: Literal.from({
            networkID,
            fromPeerID: Engine.instance.store.peerID,
            targetPeerID: toPeerID,
            message
          }).toUrl()
        }
      ]
    })
  }

  useEffect(() => {
    const topic = NetworkTopics.world

    getMutableState(NetworkState).hostIds[topic].set(networkID)

    const network = createNetwork(networkID, null, topic, {})
    addNetwork(network)

    network.ready = true

    dispatchAction(
      NetworkActions.peerJoined({
        $network: network.id,
        $topic: network.topic,
        $to: Engine.instance.store.peerID,
        peerID: Engine.instance.store.peerID,
        peerIndex: myPeerIndex,
        userID: Engine.instance.userID
      })
    )

    const agent = getState(AgentState)!

    neighbourhood.sendBroadcastU({
      links: [
        {
          source,
          predicate: IS_ANYONE_HERE,
          target: Literal.from({
            networkID,
            peerID: Engine.instance.store.peerID,
            peerIndex: myPeerIndex
          }).toUrl()
        }
      ]
    })

    const addConnection = (userID: UserID, peerID: PeerID, peerIndex: number) => {
      otherPeers.merge([{ peerID, peerIndex, userID }])
      getMutableState(PeerDIDState).peersToDID[peerID].set(userID)
      if (!getState(PeerDIDState).DIDToPeers[userID]) getMutableState(PeerDIDState).DIDToPeers[userID].set([peerID])
      else getMutableState(PeerDIDState).DIDToPeers[userID].merge([peerID])
    }

    const broadcastArrivalResponse = (toAgentID: string) => {
      /** @todo use sendSignalU when it is fixed */
      neighbourhood.sendBroadcastU({
        links: [
          {
            source: source,
            predicate: I_AM_HERE,
            target: Literal.from({
              networkID,
              peerID: Engine.instance.store.peerID,
              peerIndex: myPeerIndex
            }).toUrl()
          }
        ]
      })
    }

    const onBroadcastReceived = (expression: PerspectiveExpression) => {
      if (expression.author === agent.did) return // ignore messages from self

      console.log('onBroadcastReceived', expression)
      const link = expression.data.links[0]

      if (link.data.source !== source) return

      if (link.data.predicate === IS_ANYONE_HERE) {
        // Check if the remote host should create the offer
        // -> If so, create passive connection
        if (link.author.localeCompare(agent.did) < 1) {
          const data = getExpressionData(link.data.target) as {
            peerID: PeerID
            peerIndex: number
            networkID: NetworkID
          }
          addConnection(link.author, data.peerID, data.peerIndex)
        }
        broadcastArrivalResponse(link.author)
      }

      if (link.data.predicate === I_AM_HERE) {
        const data = getExpressionData(link.data.target) as { peerID: PeerID; peerIndex: number; networkID: NetworkID }
        // Check if we should create the offer
        // -> If so, create active connection
        if (link.author.localeCompare(agent.did) > 0) {
          addConnection(link.author, data.peerID, data.peerIndex)
        } else {
          addConnection(link.author, data.peerID, data.peerIndex)
          broadcastArrivalResponse(link.author)
        }
      }

      if (link.data.predicate === PEER_SIGNAL) {
        const data = getExpressionData(link.data.target) as SignalData

        const fromAgentpeers = getState(PeerDIDState).DIDToPeers?.[link.author] ?? []
        if (!fromAgentpeers.includes(data.fromPeerID))
          console.warn('Received message from an agent about a peer who does not control it!')

        // need to ignore messages from self
        if (data.targetPeerID !== Engine.instance.store.peerID) return
        if (data.networkID !== network.id) return

        WebRTCTransportFunctions.onMessage(sendMessage, data.networkID, data.fromPeerID, data.message)
      }

      if (link.data.predicate === LEAVE) {
        const data = getExpressionData(link.data.target) as { peerID: PeerID }
        otherPeers.set((peers) => {
          return peers.filter((p) => p.peerID !== data.peerID)
        })
        const userID = link.author as UserID
        getMutableState(PeerDIDState).peersToDID[data.peerID].set(none)
        getMutableState(PeerDIDState).DIDToPeers[userID].set((peers) => {
          return peers.filter((p) => p !== data.peerID)
        })
        if (!getState(PeerDIDState).DIDToPeers[userID].length) {
          getMutableState(PeerDIDState).DIDToPeers[userID].set(none)
        }
      }
    }

    neighbourhood.addSignalHandler(onBroadcastReceived)

    return () => {
      neighbourhood.removeSignalHandler(onBroadcastReceived)

      dispatchAction(
        NetworkActions.peerLeft({
          $network: network.id,
          $topic: network.topic,
          $to: Engine.instance.store.peerID,
          peerID: Engine.instance.store.peerID,
          userID: Engine.instance.userID
        })
      )
      removeNetwork(network)
      getMutableState(NetworkState).hostIds[topic].set(none)
    }
  }, [])

  const otherPeers = useHookstate<{ peerID: PeerID; peerIndex: number; userID: UserID }[]>([])
  console.log('otherPeers', ...otherPeers.value)

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
          key={peer.peerID}
          otherPeers={otherPeers}
          peerID={peer.peerID}
          peerIndex={peer.peerIndex}
          userID={peer.userID}
          networkID={props.networkID}
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

  useWebRTCPeerConnection(network, props.peerID, props.peerIndex, props.userID, props.sendMessage)

  /** We need an extra custom on leave callback to clear up our own state if a peer leaves rudely */
  const peerConnectionState = useMutableState(RTCPeerConnectionState)[props.networkID][props.peerID]?.value
  const isready = peerConnectionState && peerConnectionState.ready && peerConnectionState.dataChannels['actions']

  useEffect(() => {
    if (!isready) return

    return () => {
      props.otherPeers.set((peers) => {
        return peers.filter((p) => p.peerID !== props.peerID)
      })
      getMutableState(PeerDIDState).peersToDID[props.peerID].set(none)
      getMutableState(PeerDIDState).DIDToPeers[props.userID].set((peers) => {
        return peers.filter((p) => p !== props.peerID)
      })
      if (!getState(PeerDIDState).DIDToPeers[props.userID].length) {
        getMutableState(PeerDIDState).DIDToPeers[props.userID].set(none)
      }
    }
  }, [isready])

  const dataChannelRegistry = useMutableState(DataChannelRegistryState).value

  if (!peerConnectionState?.ready) return null

  return (
    <>
      {network.topic === NetworkTopics.world &&
        Object.keys(dataChannelRegistry).map((dataChannelType: DataChannelType) => (
          <DataChannelReactor
            key={dataChannelType}
            networkID={props.networkID}
            peerID={props.peerID}
            dataChannelType={dataChannelType}
          />
        ))}
    </>
  )
}
const DataChannelReactor = (props: { networkID: NetworkID; peerID: PeerID; dataChannelType: DataChannelType }) => {
  const peerConnectionState = useMutableState(RTCPeerConnectionState)[props.networkID][props.peerID].value
  const dataChannel = peerConnectionState?.dataChannels?.[props.dataChannelType] as RTCDataChannel | undefined

  useEffect(() => {
    const isInitiator = Engine.instance.store.peerID < props.peerID
    if (!isInitiator) return

    WebRTCTransportFunctions.createDataChannel(props.networkID, props.peerID, props.dataChannelType)
    return () => {
      WebRTCTransportFunctions.closeDataChannel(props.networkID, props.peerID, props.dataChannelType)
    }
  }, [])

  useEffect(() => {
    if (!dataChannel) return

    const network = getState(NetworkState).networks[props.networkID]

    const onBuffer = (e: MessageEvent) => {
      const message = e.data
      const [fromPeerIndex, data] = decode(message)
      const fromPeerID = network.peerIndexToPeerID[fromPeerIndex]
      const dataBuffer = new Uint8Array(data).buffer
      network.onBuffer(dataChannel.label as DataChannelType, fromPeerID, dataBuffer)
    }

    dataChannel.addEventListener('message', onBuffer)

    return () => {
      dataChannel.removeEventListener('message', onBuffer)
    }
  }, [dataChannel])

  return null
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
