/** Import all engine dependencies */
import '@ir-engine/engine'
/** Use fly controls */
import '@ir-engine/spatial/src/camera/systems/CameraOrbitSystem'

import {
  Entity,
  EntityTreeComponent,
  SimulationSystemGroup,
  UndefinedEntity,
  createEntity,
  defineSystem,
  getComponent,
  removeEntity,
  setComponent
} from '@ir-engine/ecs'
import { InstancingComponent } from '@ir-engine/engine/src/scene/components/InstancingComponent'
import { defineState, getMutableState, getState, useHookstate, useMutableState } from '@ir-engine/hyperflux'
import { ReferenceSpaceState, TransformComponent } from '@ir-engine/spatial'
import { NameComponent } from '@ir-engine/spatial/src/common/NameComponent'
import { MeshComponent } from '@ir-engine/spatial/src/renderer/components/MeshComponent'
import { ObjectComponent } from '@ir-engine/spatial/src/renderer/components/ObjectComponent'
import { setVisibleComponent } from '@ir-engine/spatial/src/renderer/components/VisibleComponent'
import * as d3 from 'd3-force-3d'
import * as dat from 'dat.gui'
import React, { useEffect } from 'react'
import {
  BackSide,
  BufferAttribute,
  BufferGeometry,
  CircleGeometry,
  DataTexture,
  DoubleSide,
  InstancedBufferAttribute,
  InstancedMesh,
  Line,
  LineBasicMaterial,
  Matrix4,
  MeshBasicMaterial,
  Quaternion,
  SRGBColorSpace,
  Vector3
} from 'three'

export interface NodeData {
  nodes: Array<{ id: number; label: string; imageSrc?: string }>
  edges: Array<{ id: number; source: number; target: number; weight: number }>
}

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

export const d3State = defineState({
  name: 'hxafield.conjure.d3State',
  initial: {
    dataset: null as NodeData | null,
    lineEntity: null as Entity | null,
    meshEntity: null as Entity | null,
    atlasIndices: [] as number[],
    simulation: null as d3_type | null,
    nodes: [] as d3Node[],
    links: [] as d3Link[],
    strengthFunc: 'linear' as 'equal' | 'linear' | 'exponential'
  }
})

const simulationScale = 100
const graphScale = 5 / simulationScale
const maxWeight = 5

const linkStrengths = {
  all: 1,
  0: 0,
  1: 0.05,
  2: 0.1,
  3: 0.2,
  4: 0.5
}

const calculateStrengthsEqual = (link: d3Link) => {
  const dataset = getState(d3State).dataset!
  const connection = dataset.edges[link.index]
  return linkStrengths[connection.weight] * linkStrengths.all
}
const calculateStrengthsLinear = (link: d3Link) => {
  const dataset = getState(d3State).dataset!
  const connection = dataset.edges[link.index]
  return ((connection.weight + 1) / maxWeight) * linkStrengths[connection.weight] * linkStrengths.all
}
const calculateStrengthsExponential = (link: d3Link) => {
  const dataset = getState(d3State).dataset!
  const connection = dataset.edges[link.index]
  const strength = (connection.weight + 1) / maxWeight
  return strength * strength * linkStrengths[connection.weight] * linkStrengths.all
}

/** Define strength relationship functions */
const strengthFuncs = {
  equal: calculateStrengthsEqual,
  linear: calculateStrengthsLinear,
  exponential: calculateStrengthsExponential
}

// For Working
const m = new Matrix4()
const p = new Vector3()
const q = new Quaternion()
const s = new Vector3(1, 1, 1)

const execute = () => {
  const { strengthFunc, lineEntity, links, nodes, dataset } = getState(d3State)
  if (!dataset) return

  if (lineEntity) {
    const positions = new Float32Array(links.length * 6)
    const colors = new Float32Array(links.length * 6)
    for (let i = 0; i < links.length; i++) {
      const link = links[i]
      positions[i * 6] = link.source.x * graphScale
      positions[i * 6 + 1] = link.source.y * graphScale
      positions[i * 6 + 2] = link.source.z * graphScale
      positions[i * 6 + 3] = link.target.x * graphScale
      positions[i * 6 + 4] = link.target.y * graphScale
      positions[i * 6 + 5] = link.target.z * graphScale
      const weight = strengthFuncs[strengthFunc](links[i])
      colors[i * 6] = weight
      colors[i * 6 + 1] = weight
      colors[i * 6 + 2] = weight
      colors[i * 6 + 3] = weight
      colors[i * 6 + 4] = weight
      colors[i * 6 + 5] = weight
    }
    const line = getComponent(lineEntity, ObjectComponent) as Line
    line.geometry.setAttribute('position', new BufferAttribute(positions, 3))
    line.geometry.setAttribute('color', new BufferAttribute(colors, 3))
  }

  const viewer = getState(ReferenceSpaceState).viewerEntity
  if (!viewer) return

  // make all nodes face the camera
  const cameraInverseQuaterion = getComponent(viewer, TransformComponent).rotation
  const meshEntity = getState(d3State).meshEntity

  if (!meshEntity) return

  const mesh = getComponent(meshEntity, MeshComponent) as InstancedMesh

  s.set(5, 5, 5)

  // update image positions
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]
    const x = node.x * graphScale
    const y = node.y * graphScale
    const z = node.z * graphScale
    p.set(x, y, z)
    mesh.setMatrixAt(i, m.compose(p, cameraInverseQuaterion, s))
  }

  mesh.instanceMatrix.needsUpdate = true
}

const reactor = () => {
  const dataset = useHookstate(getMutableState(d3State).dataset).value
  const { originEntity, viewerEntity } = useMutableState(ReferenceSpaceState).value

  useEffect(() => {
    if (!dataset || !originEntity || !viewerEntity) return

    /** UI */
    const gui = new dat.GUI()
    gui.domElement.style.pointerEvents = 'all'
    const folder1 = gui.addFolder('Options')
    folder1.closed = false
    const options = {
      repulsion: -10,
      distanceMax: 100,
      linkStrength: 50,
      relationship: 'linear',
      weights1: 0.05,
      weights2: 0.1,
      weights3: 0.2,
      weights4: 0.5,
      iconSize: 1,
      restart: () => {
        // wipe sim data
        const nodes = simulationData.nodes as any
        for (let i = 0; i < nodes.length; i++) {
          delete nodes[i].x
          delete nodes[i].y
          delete nodes[i].z
          delete nodes[i].vx
          delete nodes[i].vy
          delete nodes[i].vz
        }
        // reinit nodes
        simulation.nodes(nodes)
        // reheat sim
        simulation.alpha(1)
        // restart sim
        simulation.restart()
      },
      reset: () => {
        repulsionProperty.setValue(-10)
        maxDistanceProperty.setValue(100)
        relationshipProperty.setValue('exponential')
        connectionCagetogriesProperties[0].setValue(0.05)
        connectionCagetogriesProperties[1].setValue(0.1)
        connectionCagetogriesProperties[2].setValue(0.2)
        connectionCagetogriesProperties[3].setValue(0.5)
        options.restart()
      }
    }
    const repulsionProperty = folder1
      .add(options, 'repulsion', -100, 0)
      .onFinishChange((value) => {
        charge.strength(value)
        options.restart()
      })
      .name('Repulsion')
    const maxDistanceProperty = folder1
      .add(options, 'distanceMax', 0, 200)
      .onFinishChange((value) => {
        charge.distanceMax(value)
        options.restart()
      })
      .name('Max Repulsion Distance')

    const relationshipProperty = folder1
      .add(options, 'relationship', ['equal', 'linear', 'exponential'])
      .onFinishChange((value) => {
        getMutableState(d3State).strengthFunc.set(value)
        link.strength(strengthFuncs[value])
        options.restart()
      })
      .name('Relationship Strength')

    const connectionCagetogries = [1, 2, 3, 4]
    const connectionCagetogriesProperties = connectionCagetogries.map((connection) => {
      return folder1
        .add(options, 'weights' + connection, 0, 1)
        .name(connection + ' Weight')
        .onFinishChange((value) => {
          linkStrengths[connection] = value
          options.restart()
        })
    })

    folder1
      .add(options, 'iconSize', 0.1, 10)
      .name('Icon Size')
      .onChange((value) => {
        // for (const node of nodeEntities.value) getComponent(node, TransformComponent).scale.setScalar(value)
      })

    folder1.add(options, 'restart').name('Restart Simulation')
    folder1.add(options, 'reset').name('Reset Parameters')

    /** Process data */
    const simulationData = {
      nodes: dataset.nodes.map((i) => ({ id: i.id })),
      links: dataset.edges.map((id) => ({
        source: id.source,
        target: id.target
      }))
    }

    getMutableState(d3State).nodes.set(simulationData.nodes as any)
    getMutableState(d3State).links.set(simulationData.links as any)

    /** Configure simulation */

    const getID = (d: d3Node) => d.id
    const charge = d3.forceManyBody().strength(-10).distanceMax(100)
    const center = d3.forceCenter()
    const link = d3.forceLink(simulationData.links).id(getID).strength(strengthFuncs.linear)

    let simulation: d3_type

    try {
      simulation = d3.forceSimulation(simulationData.nodes, 3)

      simulation.force('link', link).force('charge', charge).force('center', center)
    } catch (e) {
      console.log(e)
      gui.destroy()
      getMutableState(d3State).nodes.set([])
      getMutableState(d3State).links.set([])
      getMutableState(d3State).meshEntity.set(UndefinedEntity)
      getMutableState(d3State).lineEntity.set(UndefinedEntity)
      return
    }

    const defaultImage = 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png'
    const nodesWithDefaultImage = [
      {
        id: -1,
        label: 'default',
        imageSrc: defaultImage
      },
      ...dataset.nodes
    ]
    // atlasImages(nodesWithDefaultImage).then(() => {

    // })
    // load images

    const entity = createEntity()
    setComponent(entity, NameComponent, 'Node')
    setComponent(entity, TransformComponent, { position: new Vector3(0, 0, 0) })
    setVisibleComponent(entity, true)

    const circleGeom = new CircleGeometry(graphScale, 16)
    const material = new MeshBasicMaterial({ side: DoubleSide })
    const mesh = new InstancedMesh(circleGeom, material, dataset.nodes.length)
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

    /** Create Line */
    const line = new Line(new BufferGeometry(), new LineBasicMaterial({ vertexColors: true }))

    const lineEntity = createEntity()
    setComponent(lineEntity, NameComponent, 'Line')
    setComponent(lineEntity, TransformComponent, { position: new Vector3(0, 0, 0) })
    setVisibleComponent(lineEntity, true)
    setComponent(lineEntity, ObjectComponent, line)
    setComponent(lineEntity, EntityTreeComponent, { parentEntity: originEntity })

    getMutableState(d3State).lineEntity.set(lineEntity)

    return () => {
      gui.destroy()
      simulation.stop()
      removeEntity(entity)
      removeEntity(lineEntity)
      getMutableState(d3State).nodes.set([])
      getMutableState(d3State).links.set([])
      getMutableState(d3State).meshEntity.set(UndefinedEntity)
      getMutableState(d3State).lineEntity.set(UndefinedEntity)
    }
  }, [!!dataset, originEntity, viewerEntity])

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
