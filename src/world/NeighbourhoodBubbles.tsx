import { getMutableState, getState, NO_PROXY_STEALTH, useHookstate } from '@ir-engine/hyperflux'
import { NetworkTopics } from '@ir-engine/network'
import * as d3 from 'd3'
import React, { useEffect, useMemo, useRef } from 'react'
import { AgentState } from '../ad4m/useADAM'
import { NeighbourhoodNetworkState } from '../ad4m/useNeighbourhoodNetwork'
import { PerspectivesState } from '../ad4m/usePerspectives'

interface Circle {
  id: string
  name: string
  color: string
  diameter: number
}

type Node = {
  id: string
  color: string
  name: string
  value: number
  radius: number
  diameter: number
  x: number
  y: number
}

const size = d3.scaleLinear().domain([1, 20]).range([20, 50]) // circle will be between 20 and 50 px wide

const BubbleLayout = (props: {
  circlesData: Array<Circle>
  width: number
  height: number
  onClick: (id: string) => void
}) => {
  const { circlesData, width, height } = props

  const ref = useRef<HTMLDivElement>(null)
  const mounted = useHookstate(false)

  const simulationState = useHookstate<d3.Simulation<d3.SimulationNodeDatum, undefined> | null>(null)

  useEffect(() => {
    if (ref.current && !mounted.value) {
      mounted.set(true)
    }
  }, [ref.current])

  useEffect(() => {
    if (!mounted.value) return

    const svg = d3.select(ref.current).append('svg').attr('width', width).attr('height', height)
    svg.append('g')

    // create a tooltip
    const Tooltip = d3
      .select(ref.current)
      .append('div')
      .style('opacity', 0)
      .attr('id', 'tooltip')
      .attr('class', 'tooltip')
      .style('background-color', 'white')
      .style('border', 'solid')
      .style('border-width', '2px')
      .style('border-radius', '5px')
      .style('padding', '5px')
      .style('position', 'absolute')
      .style('pointer-events', 'none')

    // Set up the simulation.
    const simulation = d3
      .forceSimulation()
      .force('centerX', d3.forceX(width / 2).strength(0.1))
      .force('centerY', d3.forceY(height / 2).strength(0.1))
      .force('charge', d3.forceManyBody().strength(0.1))
      .force(
        'collide',
        d3
          .forceCollide()
          .strength(0.2)
          .radius((d: any) => d.radius)
          .iterations(1)
      )

    simulation.nodes([] as Node[]).on('tick', () => {
      svg
        .select('g')
        .selectAll('circle')
        .attr('cx', (d: Node) => d.x)
        .attr('cy', (d: Node) => d.y)
    })

    simulationState.set(simulation)

    return () => {
      // delete svg
      svg.remove()
      // remove tooltip
      Tooltip.remove()
      // stop simulation
      simulation.stop()
    }
  }, [mounted.value])

  /**
   * Update the data with just the new nodes
   */
  useEffect(() => {
    if (!mounted.value) return

    const countSqrt = Math.ceil(Math.sqrt(circlesData.length))
    const newData = circlesData.map((d, i) => ({
      id: d.id,
      color: d.color,
      name: d.name,
      value: d.diameter,
      radius: size(d.diameter / 2),
      x: 50 * ((i % countSqrt) - countSqrt / 2) + width / 2,
      y: 50 * (Math.floor(i / countSqrt) - countSqrt / 2) + height / 2
    }))

    const svg = d3.select(ref.current).select('svg')

    const circle = svg.select('g').selectAll('circle').data(newData)
    const Tooltip = d3.select('#tooltip')

    // Three function that change the tooltip when user hover / move / leave a cell
    const mouseover = () => {
      Tooltip.style('opacity', 1)
    }
    const mousemove = function (event, d) {
      Tooltip.html('<u>' + d.name + '</u>' + '<br>' + d.value + ' members')
        .style('left', event.layerX + 20 + 'px')
        .style('top', event.layerY + 'px')
      // set info in
    }
    const mouseleave = () => {
      Tooltip.style('opacity', 0)
    }
    circle
      .enter()
      .append('circle')
      .attr('r', (d) => d.radius)
      .attr('cx', width / 2)
      .attr('cy', height / 2)
      .style('fill', (d) => d.color)
      .style('fill-opacity', 0.8)
      .attr('stroke', 'black')
      .style('stroke-width', 1)
      .on('mouseover', mouseover) // What to do when hovered
      .on('mousemove', mousemove)
      .on('mouseleave', mouseleave)
      .on('click', (event, d) => {
        props.onClick(d.id)
      })

    circle.transition().attr('r', (d) => d.radius)

    circle.exit().remove()

    simulationState.get(NO_PROXY_STEALTH)!.nodes(newData)
  }, [mounted.value, JSON.stringify(circlesData)])

  return (
    <div className="pointer-events-auto relative z-[10] mx-auto" style={{ width, height }}>
      <style>
        {`.node:hover{
      stroke-width: 7px !important;
      opacity: 1 !important;
    }`}
      </style>
      <div ref={ref} id={'d3_ref'} />
    </div>
  )
}

let id = 0

// test data
const circlesData = Array.from({ length: 30 }, (_, i) => ({
  id: '' + i,
  name: `Circle ${i}`,
  // random hex value
  color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
  // determinisic diameter for now
  diameter: (30 + i * 10) / 3
}))

const NeighbourhoodBubbles = () => {
  const neighbourhoodsState = useHookstate(getMutableState(PerspectivesState).neighbourhoods)

  const memberState = useHookstate({} as Record<string, string[]>)

  useEffect(() => {
    const me = getState(AgentState)!
    Object.keys(neighbourhoodsState).forEach((key) => {
      const neighbourhood = neighbourhoodsState.value[key].getNeighbourhoodProxy()
      neighbourhood.otherAgents().then((others) => {
        const members = [...others, me.did] //.map((did) => getProfile(did))
        memberState[key].set(members)
      })
    })
  }, [neighbourhoodsState.keys])

  const neighbourhoodCircles = useMemo(
    () =>
      neighbourhoodsState.keys.map((key, i) => ({
        id: key,
        name: neighbourhoodsState.value[key].name,
        // create a color based on the hash of the name
        color: randomColor(key),
        diameter: memberState.value[key]?.length ?? 1
      })),
    [neighbourhoodsState.keys, memberState]
  )

  const addCommunity = () => {
    console.log('TODO: add community')
  }

  useEffect(() => {
    const url = new URL(window.location.href)
    const neighbourhood = url.searchParams.get('neighbourhood')
    url.search = url.searchParams.toString()
    if (neighbourhood && neighbourhoodsState.value[neighbourhood]) {
      onJoinNeighbourhood(neighbourhood)
    }
  }, [neighbourhoodsState])

  const onJoinNeighbourhood = (sharedURL: string) => {
    getMutableState(NeighbourhoodNetworkState).set([{ topic: NetworkTopics.world, sharedUrl: sharedURL }])

    /**
     * @todo to get around the pubsub subscription race condition,
     * use a significant delay to connect to the media server a few seconds late
     */
    setTimeout(() => {
      getMutableState(NeighbourhoodNetworkState).merge([{ topic: NetworkTopics.media, sharedUrl: sharedURL }])
    }, 1000)
  }

  return (
    <div>
      <h1 className="my-4 text-center text-2xl">My Neighbourhoods</h1>
      <BubbleLayout circlesData={neighbourhoodCircles} width={800} height={600} onClick={onJoinNeighbourhood} />
      {/* <button
        onClick={addCommunity}
        className="pointer-events-auto absolute right-2.5 top-2.5 flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border-none bg-blue-500 text-2xl text-white"
      >
        +
      </button> */}
    </div>
  )
}

export default NeighbourhoodBubbles

/**
 * Convert a string to a hex string
 */
function toHex(str: string) {
  let result = ''
  for (let i = 0; i < str.length; i++) {
    result += str.charCodeAt(i).toString(10)
  }
  return result
}

/**
 * Creates a deterministic color based on a seed string
 */
function randomColor(seed: string, rangeSize = 100) {
  const base10Str = toHex(seed.slice(-6))
  const [num0, num1, num2, num3] = base10Str.split('').map((n) => parseInt(n, 10) / 10)

  const parts = [
    Math.floor(num0 * 256),
    Math.floor(num1 * rangeSize),
    Math.floor(num2 * rangeSize) + 256 - rangeSize
  ].sort(() => num3 % 2)

  return '#' + parts.map((p) => p.toString(16).padStart(2, '0')).join('')
}
