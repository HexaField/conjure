import * as d3 from 'd3-force-3d'

import { ForcegraphMessage, StartMessage, StopMessage, UpdateMessage } from './ForcegraphMessages'

type d3_type = {
  tick: (iterations: number) => d3_type
  restart: () => d3_type
  stop: () => d3_type
  numDimensions: (num?: number) => number
  nodes: (nodes: d3Node[]) => d3_type | d3Node[]
  alpha: (alpha?: number) => number
  alphaMin: (alphaMin?: number) => number
  alphaDecay: (alphaDecay?: number) => number
  alphaTarget: (alphaTarget?: number) => number
  velocityDecay: (velocityDecay?: number) => number
  randomSource: (randomSource?: () => number) => () => number
  force: (name: string, force: any) => d3_type
  find: (x: number, y: number, z: number, radius: number) => d3Node
  on: (type: string, listener: (event: any) => void) => d3_type
  _nodes: d3Node[]
  _links: d3Link[]
  _charge: d3.ForceManyBody<d3Node>
  _link: d3.ForceLink<d3Node, d3.Link<d3Node>>
  _center: d3.ForceCenter<d3Node>
}

type d3Node = {
  id: number
  index: 1
  vx: number
  vy: number
  vz: number
  x: number
  y: number
  z: number
}

type d3Link = {
  index: number
  source: d3Node
  target: d3Node
}
const getID = (d: d3.Node) => d.id
const maxWeight = 5

const linkStrengths = {
  0: 0,
  1: 0.05,
  2: 0.1,
  3: 0.2,
  4: 0.5
}

const startForceGraph = (data: StartMessage) => {
  const calculateStrengthsEqual = (link: d3.Link) => {
    const connection = data.links[link.index]
    return linkStrengths[connection.weight]
  }
  const calculateStrengthsLinear = (link: d3.Link) => {
    const connection = data.links[link.index]
    return ((connection.weight + 1) / maxWeight) * linkStrengths[connection.weight]
  }
  const calculateStrengthsExponential = (link: d3.Link) => {
    const connection = data.links[link.index]
    const strength = (connection.weight + 1) / maxWeight
    return strength * strength * linkStrengths[connection.weight]
  }

  /** Define strength relationship functions */
  const strengthFuncs = {
    equal: calculateStrengthsEqual,
    linear: calculateStrengthsLinear,
    exponential: calculateStrengthsExponential
  }

  const charge = d3.forceManyBody().strength(-10).distanceMax(100)
  const center = d3.forceCenter()
  const link = d3.forceLink(data.links).id(getID) //.strength(strengthFuncs.linear)

  const simulation = d3.forceSimulation(data.nodes, 3) as d3_type

  simulation.force('link', link).force('charge', charge).force('center', center)

  simulation.on('tick', () => {
    const nodes = data.nodes as d3Node[]
    const links = data.links as any as d3Link[]
    const bufferOut = new Float32Array(nodes.length * 3 + links.length * 6 + 1)

    const linksOffset = nodes.length * 3

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i]
      bufferOut[i * 3] = node.x
      bufferOut[i * 3 + 1] = node.y
      bufferOut[i * 3 + 2] = node.z
    }

    for (let i = 0; i < links.length; i++) {
      const link = links[i]
      bufferOut[linksOffset + i * 6] = link.source.x
      bufferOut[linksOffset + i * 6 + 1] = link.source.y
      bufferOut[linksOffset + i * 6 + 2] = link.source.z
      bufferOut[linksOffset + i * 6 + 3] = link.target.x
      bufferOut[linksOffset + i * 6 + 4] = link.target.y
      bufferOut[linksOffset + i * 6 + 5] = link.target.z
    }

    bufferOut[bufferOut.length - 1] = data.id

    // post as transferable
    // @ts-ignore
    self.postMessage(bufferOut, [bufferOut.buffer])
  })

  simulation._nodes = data.nodes as d3Node[]
  simulation._links = data.links as any as d3Link[]
  simulation._charge = charge
  simulation._link = link
  simulation._center = center

  graphs[data.id] = simulation

  return simulation
}

const updateForceGraph = (data: UpdateMessage) => {
  const forceGraph = graphs[data.id]
  if (!forceGraph) return
  if (data.distanceMax) {
    forceGraph!._charge.distanceMax(data.distanceMax)
  }
  if (data.repulsion) {
    forceGraph!._charge.strength(data.repulsion)
  }
  // if (data.relationship) { }
  if (data.restart) {
    // wipe sim data
    const nodes = forceGraph!._nodes
    for (let i = 0; i < nodes.length; i++) {
      nodes[i].x = 0
      nodes[i].y = 0
      nodes[i].z = 0
      nodes[i].vx = 0
      nodes[i].vy = 0
      nodes[i].vz = 0
    }
    // reinit nodes
    forceGraph!.nodes(nodes)
    // reheat sim
    forceGraph!.alpha(1)
    // restart sim
    forceGraph!.restart()
  }
}

const endForceGraph = ({ id }: StopMessage) => {
  const forceGraph = graphs[id]
  if (!forceGraph) return
  forceGraph.stop()
  delete graphs[id]
}

const graphs = {} as Record<number, ReturnType<typeof startForceGraph>>

let forceGraph: ReturnType<typeof startForceGraph> | undefined

// ping back we are ready
self.postMessage({ type: 'ready' })

self.onmessage = (event) => {
  const { type, id } = event.data as ForcegraphMessage
  switch (type) {
    case 'start':
      startForceGraph(event.data as StartMessage)
      break
    case 'stop':
      endForceGraph(event.data as StopMessage)
      break
    case 'update':
      updateForceGraph(event.data as UpdateMessage)
    default:
      break
  }
}
