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
import * as dat from 'dat.gui'
import React, { useEffect } from 'react'
import {
  BackSide,
  BufferAttribute,
  BufferGeometry,
  BoxGeometry,
  Color,
  DataTexture,
  DoubleSide,
  InstancedBufferAttribute,
  InstancedMesh,
  Line,
  Matrix4,
  MeshBasicMaterial,
  NormalBlending,
  Quaternion,
  RawShaderMaterial,
  Sphere,
  SRGBColorSpace,
  Vector3
} from 'three'
import { stringToColor } from '../../../utils/stringToColor'
import { JSONSchemaType } from '../../json-schema/JSONSchema'
import { TargetRegistry, TargetSchemaDefinition } from '../../registries/TargetRegistry'
import { startWebworker } from './createWorker'

export interface Node {
  id: string | number
  label: string
  group: string
  imageSrc: string
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

export const dagState = defineState({
  name: 'hxafield.conjure.dagState',
  initial: {
    lineEntity: null as Entity | null,
    meshEntity: null as Entity | null,
    atlasIndices: [] as number[],
    nodes: [] as Array<Node>,
    links: [] as Array<Edge>
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
  const { lineEntity, links, nodes, meshEntity } = getState(dagState)
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

  // update node positions
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

  const buttons = InputComponent.getButtons(viewer)
  if (!buttons.PrimaryClick?.inputSourceEntity) return

  const inputSource = getComponent(buttons.PrimaryClick?.inputSourceEntity, InputSourceComponent)
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

  if (buttons.PrimaryClick?.down) {
    selectedNodeIndex = selectedNodeIndex === hoveredNodeIndex ? -1 : hoveredNodeIndex
  }

  nodeFocusTransition.setState(selectedNodeIndex > -1 || hoveredNodeIndex > -1 ? 'IN' : 'OUT')
}

const reactor = () => {
  useEffect(() => {
    TargetRegistry.register(DagSchema)
  }, [])

  const dag = useHookstate(getMutableState(dagState))
  const { originEntity, viewerEntity } = useMutableState(ReferenceSpaceState).value

  useEffect(() => {
    const state = getState(dagState)

    if (!state.nodes.length || !state.links.length || !originEntity || !viewerEntity) return

    const { worker, id, update, destroy } = startWebworker(state.nodes as Node[], state.links as Edge[], (data) => {
      const linksOffset = state.nodes.length * 3
      const positions = new Float32Array(state.links.length * 6)
      for (let i = 0; i < state.links.length; i++) {
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
    })

    /** UI */
    const gui = new dat.GUI()
    gui.domElement.style.pointerEvents = 'all'
    const folder1 = gui.addFolder('DAG Options')
    folder1.closed = false
    const options = {
      nodeSpacing: 50,
      levelSpacing: 100,
      alignment: 'center',
      direction: 'horizontal',
      restart: () => {
        update({
          restart: true,
          nodeSpacing: nodeSpacingProperty.getValue(),
          levelSpacing: levelSpacingProperty.getValue(),
          alignment: alignmentProperty.getValue(),
          direction: directionProperty.getValue()
        })
      },
      reset: () => {
        nodeSpacingProperty.setValue(50)
        levelSpacingProperty.setValue(100)
        alignmentProperty.setValue('center')
        directionProperty.setValue('horizontal')
        update({ nodeSpacing: 50, levelSpacing: 100, alignment: 'center', direction: 'horizontal' })
        options.restart()
      }
    }
    const nodeSpacingProperty = folder1
      .add(options, 'nodeSpacing', 10, 200)
      .onFinishChange((value) => {
        update({ nodeSpacing: value })
      })
      .name('Node Spacing')
    const levelSpacingProperty = folder1
      .add(options, 'levelSpacing', 50, 300)
      .onFinishChange((value) => {
        update({ levelSpacing: value })
      })
      .name('Level Spacing')

    const alignmentProperty = folder1
      .add(options, 'alignment', ['top', 'center', 'bottom'])
      .onFinishChange((value) => {
        update({ alignment: value })
      })
      .name('Alignment')

    const directionProperty = folder1
      .add(options, 'direction', ['horizontal', 'vertical'])
      .onFinishChange((value) => {
        update({ direction: value })
      })
      .name('Direction')

    folder1.add(options, 'restart').name('Restart Layout')
    folder1.add(options, 'reset').name('Reset Parameters')

    const entity = createEntity()
    setComponent(entity, NameComponent, 'DAG Node')
    setComponent(entity, TransformComponent, { position: new Vector3(0, 0, 0) })
    setVisibleComponent(entity, true)

    // Use box geometry for DAG nodes to differentiate from force graph circles
    const boxGeom = new BoxGeometry(graphScale * 2, graphScale * 2, graphScale * 0.5)
    const material = new MeshBasicMaterial({ side: DoubleSide })

    const mesh = new InstancedMesh(boxGeom, material, state.nodes.length)
    // colors are a quick way to visualize group data

    const colors = new Map<string, Color>()

    // set the color for each node using mesh.setColorAt
    for (let i = 0; i < state.nodes.length; i++) {
      const node = state.nodes[i]
      if (!node.group) continue // will be white
      if (!colors.has(node.group)) colors.set(node.group, new Color(stringToColor(node.group)))
      const color = colors.get(node.group)!
      mesh.setColorAt(i, color)
    }

    mesh.frustumCulled = false
    setComponent(entity, MeshComponent, mesh)

    setComponent(entity, EntityTreeComponent, { parentEntity: originEntity })
    setComponent(entity, InstancingComponent, { instanceMatrix: mesh.instanceMatrix })

    getMutableState(dagState).meshEntity.set(entity)

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
        blending: NormalBlending,
        fragmentShader: lineFragmentShader,
        vertexShader: lineVertexShader
      })
    )

    const lineEntity = createEntity()
    setComponent(lineEntity, NameComponent, 'DAG Line')
    setComponent(lineEntity, TransformComponent, { position: new Vector3(0, 0, 0) })
    setVisibleComponent(lineEntity, true)
    setComponent(lineEntity, ObjectComponent, line)
    setComponent(lineEntity, EntityTreeComponent, { parentEntity: originEntity })

    getMutableState(dagState).lineEntity.set(lineEntity)

    // this is ridiculous
    getMutableState(EngineState).isEditing.set(true)
    setComponent(viewerEntity, CameraOrbitComponent)

    return () => {
      destroy()
      gui.destroy()
      removeEntity(entity)
      removeEntity(lineEntity)
      getMutableState(dagState).meshEntity.set(UndefinedEntity)
      getMutableState(dagState).lineEntity.set(UndefinedEntity)
    }
  }, [dag.nodes, dag.links, originEntity, viewerEntity])

  return null
}

const DagSystem = defineSystem({
  uuid: 'hexafield.conjure.DagSystem',
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

const dagSchema: JSONSchemaType<SerializedDagShape> = {
  type: 'object',
  required: ['nodes', 'edges'],
  properties: {
    nodes: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'label'],
        properties: {
          id: { type: 'string' },
          label: { type: 'string' },
          group: { type: 'string', nullable: true, default: '' },
          image: { type: 'string', nullable: true, default: '' }
        }
      }
    },
    edges: {
      type: 'array',
      items: {
        type: 'object',
        required: ['source', 'target'],
        properties: {
          source: { type: 'string' },
          target: { type: 'string' },
          weight: { type: 'number', nullable: true, default: 1 }
        }
      }
    }
  }
}

type SerializedDagShape = {
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

export const DagSchema: TargetSchemaDefinition<SerializedDagShape> = {
  label: 'DAG Graph',
  value: dagSchema,
  deserialize: (data) => {
    const finalData: SerializedDagShape = { nodes: [], edges: [] }
    const seenLabels = new Map<string, { source: string; id: number | string }>()
    const replacedNodes = {} as Record<string, Map<number | string, number | string>>
    let maxWeight = 0

    for (const sourceID in data) {
      const source = data[sourceID]
      if (typeof source !== 'object') continue
      
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

    const minConnections = 1

    // quick hack, remove all nodes that only have one edge
    const nodeCounts = new Map<string | number, number>()
    for (const edge of finalData.edges) {
      nodeCounts.set(edge.source, (nodeCounts.get(edge.source) || 0) + 1)
      nodeCounts.set(edge.target, (nodeCounts.get(edge.target) || 0) + 1)
      // scale all weights between 0 and 1
      edge.weight = edge.weight! / maxWeight
    }
    finalData.nodes = finalData.nodes.filter(
      (node) => nodeCounts.get(node.id) && nodeCounts.get(node.id)! >= minConnections
    )
    // and now remove all edges that don't have both nodes
    finalData.edges = finalData.edges.filter(
      (edge) =>
        finalData.nodes.find((node) => node.id === edge.source) &&
        finalData.nodes.find((node) => node.id === edge.target)
    )

    if (!finalData.nodes.length) return null!

    getMutableState(dagState).nodes.set(finalData.nodes as NodeData['nodes'])
    getMutableState(dagState).links.set(finalData.edges as NodeData['edges'])
  }
}
