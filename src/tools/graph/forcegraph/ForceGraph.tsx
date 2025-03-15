/** Import all engine dependencies */
import '@ir-engine/engine'
/** Use fly controls */
import '@ir-engine/spatial/src/camera/systems/CameraOrbitSystem'

import {
  createEntity,
  defineSystem,
  ECSState,
  EngineState,
  Entity,
  EntityTreeComponent,
  getComponent,
  removeEntity,
  setComponent,
  SimulationSystemGroup,
  UndefinedEntity
} from '@ir-engine/ecs'
import { InstancingComponent } from '@ir-engine/engine/src/scene/components/InstancingComponent'
import { defineState, getMutableState, getState, useHookstate, useMutableState } from '@ir-engine/hyperflux'
import { ReferenceSpaceState, TransformComponent } from '@ir-engine/spatial'
import { CameraOrbitComponent } from '@ir-engine/spatial/src/camera/components/CameraOrbitComponent'
import { createTransitionState } from '@ir-engine/spatial/src/common/functions/createTransitionState'
import { NameComponent } from '@ir-engine/spatial/src/common/NameComponent'
import { InputComponent } from '@ir-engine/spatial/src/input/components/InputComponent'
import { InputSourceComponent } from '@ir-engine/spatial/src/input/components/InputSourceComponent'
import { MeshComponent } from '@ir-engine/spatial/src/renderer/components/MeshComponent'
import { ObjectComponent } from '@ir-engine/spatial/src/renderer/components/ObjectComponent'
import { setVisibleComponent } from '@ir-engine/spatial/src/renderer/components/VisibleComponent'
import React, { useEffect } from 'react'
import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  CircleGeometry,
  Color,
  DataTexture,
  DoubleSide,
  InstancedBufferAttribute,
  InstancedMesh,
  Line,
  Matrix4,
  MeshBasicMaterial,
  Quaternion,
  RawShaderMaterial,
  Sphere,
  SRGBColorSpace,
  Vector3
} from 'three'
import { randomColor } from '../../../utils/randomColor'
import { TargetVisualizationState } from '../DataState'
import { JSONSchema } from '../functions/generateJsonSchema'
import { startWebworker } from './createWorker'

export interface Node {
  id: number
  label: string
  group?: string
  imageSrc?: string
}

export interface Edge {
  id: number
  source: number
  target: number
  weight: number
}

export interface NodeData {
  nodes: Node[]
  edges: Edge[]
}

export const d3State = defineState({
  name: 'hxafield.conjure.d3State',
  initial: {
    lineEntity: null as Entity | null,
    meshEntity: null as Entity | null,
    atlasIndices: [] as number[],
    nodes: [] as Array<Node>,
    links: [] as Array<Edge>
    // strengthFunc: 'linear' as 'equal' | 'linear' | 'exponential'
  }
})

const iconScale = 5
const simulationScale = 100
const graphScale = iconScale / simulationScale

// For Working
const m = new Matrix4()
const p = new Vector3()
const q = new Quaternion()
const s = new Vector3(1, 1, 1)

const _vec3 = new Vector3()
const sphere = new Sphere()
sphere.radius = graphScale

let selectedNodeIndex = -1
let hoveredNodeIndex = -1
let hoverAlpha = 1
const inactiveAlpha = 0.01
let nodeFocusTransition = createTransitionState(0.25, 'OUT')

// buffer is 3 floats per vertex, 6 floats per line
let lastBuffer: ArrayBuffer | null = null

const execute = () => {
  const { lineEntity, links, nodes, meshEntity } = getState(d3State)
  if (!meshEntity) return

  const mesh = getComponent(meshEntity, MeshComponent) as InstancedMesh

  const viewer = getState(ReferenceSpaceState).viewerEntity

  const cameraTransform = getComponent(viewer, TransformComponent)
  const cameraPosition = cameraTransform.position
  const cameraRotation = cameraTransform.rotation

  if (!lastBuffer) return

  nodeFocusTransition.update(getState(ECSState).deltaSeconds, (alpha) => {
    hoverAlpha = 1 - alpha * inactiveAlpha
  })

  if (lineEntity) {
    const colors = new Float32Array(links.length * 8)
    for (let i = 0; i < links.length; i++) {
      const link = links[i]

      const hoveredNodeID = hoveredNodeIndex === -1 ? null : nodes[hoveredNodeIndex].id
      const selectedNodeID = selectedNodeIndex === -1 ? null : nodes[selectedNodeIndex].id
      const isFocused =
        link.source === hoveredNodeID ||
        link.target === hoveredNodeID ||
        link.source === selectedNodeID ||
        link.target === selectedNodeID
      const weight = 1 //strengthFuncs[strengthFunc](links[i])
      const alpha = isFocused ? hoverAlpha : inactiveAlpha
      const currentLinkNodeIndex = i * 8
      colors[currentLinkNodeIndex] = weight
      colors[currentLinkNodeIndex + 1] = weight
      colors[currentLinkNodeIndex + 2] = weight
      colors[currentLinkNodeIndex + 3] = alpha
      colors[currentLinkNodeIndex + 4] = weight
      colors[currentLinkNodeIndex + 5] = weight
      colors[currentLinkNodeIndex + 6] = weight
      colors[currentLinkNodeIndex + 7] = alpha
    }
    const line = getComponent(lineEntity, ObjectComponent) as Line
    line.geometry.setAttribute('color', new BufferAttribute(colors, 4, true))
  }

  // update image positions
  for (let i = 0; i < nodes.length; i++) {
    const x = lastBuffer[i * 3] * graphScale
    const y = lastBuffer[i * 3 + 1] * graphScale
    const z = lastBuffer[i * 3 + 2] * graphScale
    p.set(x, y, z)
    mesh.setMatrixAt(i, m.compose(p, cameraRotation, s))
  }
  mesh.instanceMatrix.needsUpdate = true

  const rayhits = [] as { x: number; y: number; z: number; i: number; distance: number }[]

  const inputSources = InputComponent.getInputSourceEntities(viewer)
  if (!inputSources.length) {
    if (selectedNodeIndex === -1) nodeFocusTransition.setState('OUT')
    return
  }

  const inputSource = getComponent(inputSources[0], InputSourceComponent)
  const ray = inputSource.raycaster.ray

  for (let i = 0; i < nodes.length; i++) {
    const x = lastBuffer[i * 3] * graphScale
    const y = lastBuffer[i * 3 + 1] * graphScale
    const z = lastBuffer[i * 3 + 2] * graphScale
    p.set(x, y, z)
    sphere.center.copy(p)
    const hit = ray.intersectSphere(sphere, _vec3)
    if (hit) rayhits.push({ x, y, z, i, distance: cameraPosition.distanceToSquared(p) })
  }

  const closestHit = rayhits.sort((a, b) => a.distance - b.distance)[0]
  if (closestHit) {
    hoveredNodeIndex = closestHit.i
  } else {
    hoveredNodeIndex = -1
  }

  const buttons = InputComponent.getMergedButtons(viewer)
  if (buttons.PrimaryClick?.down) {
    selectedNodeIndex = selectedNodeIndex === hoveredNodeIndex ? -1 : hoveredNodeIndex
  }

  nodeFocusTransition.setState(selectedNodeIndex > -1 || hoveredNodeIndex > -1 ? 'IN' : 'OUT')
}

const reactor = () => {
  useEffect(() => {
    getMutableState(TargetVisualizationState).merge({ [ForceGraphSchema.id]: ForceGraphSchema })
  }, [])

  const d3 = useHookstate(getMutableState(d3State))
  const { originEntity, viewerEntity } = useMutableState(ReferenceSpaceState).value

  useEffect(() => {
    const { nodes, links } = getState(d3State)

    if (!nodes.length || !links.length || !originEntity || !viewerEntity) return

    const abortController = new AbortController()
    let cleanupWorker: (() => void) | null = null

    startWebworker(nodes as Node[], links as Edge[], (data) => {
      const linksOffset = nodes.length * 3
      const positions = new Float32Array(links.length * 6)
      for (let i = 0; i < links.length; i++) {
        const currentLinkIndex = i * 6
        positions[currentLinkIndex] = data[linksOffset + currentLinkIndex] * graphScale
        positions[currentLinkIndex + 1] = data[linksOffset + currentLinkIndex + 1] * graphScale
        positions[currentLinkIndex + 2] = data[linksOffset + currentLinkIndex + 2] * graphScale
        positions[currentLinkIndex + 3] = data[linksOffset + currentLinkIndex + 3] * graphScale
        positions[currentLinkIndex + 4] = data[linksOffset + currentLinkIndex + 4] * graphScale
        positions[currentLinkIndex + 5] = data[linksOffset + currentLinkIndex + 5] * graphScale
      }
      const line = getComponent(lineEntity, ObjectComponent) as Line
      line.geometry.setAttribute('position', new BufferAttribute(positions, 3))
      lastBuffer = data
    }).then(([worker, cleanup]) => {
      if (abortController.signal.aborted) {
        cleanup()
        return
      }

      cleanupWorker = cleanup
    })

    try {
      // webworker
    } catch (e) {
      console.log(e)
      getMutableState(d3State).nodes.set([])
      getMutableState(d3State).links.set([])
      getMutableState(d3State).meshEntity.set(UndefinedEntity)
      getMutableState(d3State).lineEntity.set(UndefinedEntity)
      return
    }

    const entity = createEntity()
    setComponent(entity, NameComponent, 'Node')
    setComponent(entity, TransformComponent, { position: new Vector3(0, 0, 0) })
    setVisibleComponent(entity, true)

    const circleGeom = new CircleGeometry(graphScale, 16)
    const material = new MeshBasicMaterial({ side: DoubleSide })

    const mesh = new InstancedMesh(circleGeom, material, nodes.length)
    // colors are a quick way to visualize group data

    const colors = new Map<string, Color>()

    // set the color for each node using mesh.setColorAt
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i]
      if (!node.group) continue // will be white
      if (!colors.has(node.group)) colors.set(node.group, new Color(randomColor(node.group)))
      const color = colors.get(node.group)!
      mesh.setColorAt(i, color)
    }

    mesh.frustumCulled = false
    setComponent(entity, MeshComponent, mesh)

    setComponent(entity, EntityTreeComponent, { parentEntity: originEntity })
    setComponent(entity, InstancingComponent, { instanceMatrix: mesh.instanceMatrix })

    // getMutableState(d3State).atlasIndices.set(Array.from(indicies))
    getMutableState(d3State).meshEntity.set(entity)

    // debug entity for the atlas
    // const debugEntity = createEntity()
    // setComponent(debugEntity, NameComponent, 'Atlas')
    // setComponent(debugEntity, TransformComponent, { position: new Vector3(0, 0, 0) })
    // setVisibleComponent(debugEntity, true)
    // const debugMesh = new Mesh(new PlaneGeometry(10, 10), new MeshBasicMaterial({ map: texture }))
    // setComponent(debugEntity, MeshComponent, debugMesh)
    // setComponent(debugEntity, EntityTreeComponent, { parentEntity: originEntity })

    const lineVertexShader = `
precision mediump float;
precision mediump int;

uniform mat4 modelViewMatrix; // optional
uniform mat4 projectionMatrix; // optional

attribute vec3 position;
attribute vec4 color;

varying vec3 vPosition;
varying vec4 vColor;

void main()	{

  vPosition = position;
  vColor = color;

  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

}`

    const lineFragmentShader = `
precision mediump float;
precision mediump int;

uniform float time;

varying vec3 vPosition;
varying vec4 vColor;

void main()	{
  vec4 color = vec4( vColor );

  gl_FragColor = color;

}`

    /** Create Line */
    const line = new Line(
      new BufferGeometry(),
      new RawShaderMaterial({
        vertexColors: true,
        transparent: true,
        depthTest: false,
        blending: AdditiveBlending,
        fragmentShader: lineFragmentShader,
        vertexShader: lineVertexShader
      })
    )

    const lineEntity = createEntity()
    setComponent(lineEntity, NameComponent, 'Line')
    setComponent(lineEntity, TransformComponent, { position: new Vector3(0, 0, 0) })
    setVisibleComponent(lineEntity, true)
    setComponent(lineEntity, ObjectComponent, line)
    setComponent(lineEntity, EntityTreeComponent, { parentEntity: originEntity })

    getMutableState(d3State).lineEntity.set(lineEntity)

    // this is ridiculous
    getMutableState(EngineState).isEditing.set(true)
    setComponent(viewerEntity, CameraOrbitComponent, {
      focusedEntities: [entity]
      // refocus: true,
      // isOrbiting: true
    })

    return () => {
      if (cleanupWorker) cleanupWorker()
      removeEntity(entity)
      removeEntity(lineEntity)
      getMutableState(d3State).meshEntity.set(UndefinedEntity)
      getMutableState(d3State).lineEntity.set(UndefinedEntity)
      abortController.abort()
    }
  }, [d3.nodes, d3.links, originEntity, viewerEntity])

  return null
}

const ForceGraphSystem = defineSystem({
  uuid: 'hexafield.conjure.ForceGraphSystem',
  insert: { with: SimulationSystemGroup },
  execute,
  reactor
})

export const ControlHelper = () => {
  return (
    <div className={'w-full'}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          height: '100%',
          width: '100%',
          flexDirection: 'column'
        }}
      >
        <div
          style={{
            // default values will be overridden by theme
            fontFamily: 'Lato',
            fontSize: '12px',
            color: 'gray'
          }}
        >
          {`(F) to reset view || (Left Click) to orbit || (Scroll) to zoom || (Right Click) to pan || (Right Click + WASD) to fly`}
        </div>
      </div>
    </div>
  )
}

const forcegraphSchema: JSONSchema = {
  type: 'object',
  properties: {
    nodes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          label: { type: 'string' },
          image: { type: 'string', optional: true }
        }
      }
    },
    edges: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          source: { type: 'string' },
          target: { type: 'string' },
          weight: { type: 'number', optional: true }
        }
      }
    }
  }
}

type ForceGraphShape = {
  nodes: Array<{
    id: string | number
    label: string
    group?: string
    image?: string
  }>
  edges: Array<{
    source: string | number
    target: string | number
    weight?: number
  }>
}

const ForceGraphSchema = {
  id: 'hexafield.conjure.graph-tool.ForceGraph',
  label: 'Force Graph',
  value: forcegraphSchema,
  onData: (data: Record<string, ForceGraphShape>) => {
    const finalData: ForceGraphShape = { nodes: [], edges: [] }
    const seenLabels = new Map<string, { source: string; id: number | string }>()
    const replacedNodes = {} as Record<string, Map<number | string, number | string>>
    let maxWeight = 0
    for (const sourceID in data) {
      const source = data[sourceID]
      if (typeof source !== 'object') continue
      //sum the various data sources together, distinguishing different sources by the 'category' field on nodes
      /** @todo this should be a configurable field in the mapping UI - need support for a 'literal' either at the source or overall level */
      if (Array.isArray(source.nodes)) {
        for (let i = 0; i < source.nodes.length; i++) {
          const node = source.nodes[i]
          const seenNode = seenLabels.get(node.label)
          if (seenNode) {
            if (!replacedNodes[sourceID]) {
              replacedNodes[sourceID] = new Map()
            }
            replacedNodes[sourceID].set(node.id, seenNode.id)
          } else {
            seenLabels.set(node.label, { source: sourceID, id: node.id })
            finalData.nodes.push({
              ...node,
              group: sourceID
            })
          }
        }
      }
      if (Array.isArray(source.edges)) {
        for (const edge of source.edges) {
          finalData.edges.push({
            source: replacedNodes[sourceID]?.get(edge.source) ?? edge.source,
            target: replacedNodes[sourceID]?.get(edge.target) ?? edge.target,
            weight: edge.weight
          })
        }
      }
    }
    // ensure all edges have a weight
    for (const edge of finalData.edges) {
      edge.weight = edge.weight || 1
      maxWeight = Math.max(maxWeight, edge.weight)
    }

    const minConnections = 3

    // quick hack, remove all nodes that only have one edge
    const nodeCounts = new Map<string | number, number>()
    for (const edge of finalData.edges) {
      nodeCounts.set(edge.source, (nodeCounts.get(edge.source) || 0) + 1)
      nodeCounts.set(edge.target, (nodeCounts.get(edge.target) || 0) + 1)
      // scale all weights between 0 and 1
      edge.weight = edge.weight! / maxWeight
    }
    finalData.nodes = finalData.nodes.filter(
      (node) => nodeCounts.get(node.id) // && nodeCounts.get(node.id)! >= minConnections
    )
    // and now remove all edges that don't have both nodes
    finalData.edges = finalData.edges.filter(
      (edge) =>
        finalData.nodes.find((node) => node.id === edge.source) &&
        finalData.nodes.find((node) => node.id === edge.target)
    )

    if (!finalData.nodes.length) return null

    return finalData
  },

  onConfirm: (data) => {
    getMutableState(d3State).nodes.set(data.nodes)
    getMutableState(d3State).links.set(data.edges)
  }
}

/** Atlas Code */

// const defaultImage = 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png'
// const nodesWithDefaultImage = [
//   {
//     id: -1,
//     label: 'default',
//     imageSrc: defaultImage
//   },
//   ...dataset.nodes
// ]

const atlasImages = async (nodesWithDefaultImage: NodeData['nodes']) => {
  const images = await Promise.all(
    nodesWithDefaultImage.map((node) => {
      return new Promise<HTMLImageElement | null>((resolve) => {
        if (!node.imageSrc) return resolve(null)
        const image = new Image()
        image.onload = () => {
          resolve(image)
        }
        image.crossOrigin = 'Anonymous'
        image.onerror = (e) => {
          resolve(null!)
          console.log('failed to load image', node.imageSrc, e)
        }
        image.src = `https://cors-anywhere.herokuapp.com/${node.imageSrc!}`
      })
      // take loaded images and convert them into an atlas map. assume the images are the square and the same size
    })
  )

  const imagesLoaded = images.filter((i) => !!i)
  const atlasSize = Math.ceil(Math.sqrt(imagesLoaded.length))
  const atlas = document.createElement('canvas')
  const resolution = 128
  atlas.width = atlasSize * resolution
  atlas.height = atlasSize * resolution
  const ctx = atlas.getContext('2d')!
  const indicies = new Set<number>()
  imagesLoaded.forEach((image, i) => {
    // flip image
    const x = i % atlasSize
    const y = Math.floor(i / atlasSize)
    ctx.drawImage(image!, x * resolution, y * resolution, resolution, resolution)
    indicies.add(i)
  })
  //convert the atlas to imagedata and then a blob
  const imageData = ctx.getImageData(0, 0, atlas.width, atlas.height)

  const texture = new DataTexture(imageData.data, atlas.width, atlas.height)
  texture.colorSpace = SRGBColorSpace
  texture.needsUpdate = true
  // texture.flipY = true
  const material = new MeshBasicMaterial({ map: texture, side: BackSide })
  const circleGeom = new CircleGeometry(graphScale, 16).scale(1, -1, 1) // unflip y

  const uvOffset = new Float32Array(images.length * 2)
  // set the uv offset for each image, accounting for images that are not loaded
  for (let i = 0; i < images.length; i++) {
    const isLoaded = indicies.has(i)
    if (!isLoaded) continue
    // start from top left
    const x = i % atlasSize
    const y = Math.floor(i / atlasSize)
    uvOffset[i * 2] = x / atlasSize
    uvOffset[i * 2 + 1] = y / atlasSize
  }
  circleGeom.setAttribute('uvOffset', new InstancedBufferAttribute(uvOffset, 2))

  material.onBeforeCompile = function (shader) {
    shader.vertexShader = shader.vertexShader.replace('void main() {', 'attribute vec2 uvOffset;\n' + 'void main() {')

    shader.vertexShader = shader.vertexShader.replace(
      '#include <uv_vertex>',
      '#include <uv_vertex>\n' + `vMapUv = (uv * ${1 / atlasSize}) + uvOffset;`
    )
  }

  const mesh = new InstancedMesh(circleGeom, material, images.length)
  mesh.frustumCulled = false
}
