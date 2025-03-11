import { createWorkerFromCrossOriginURL } from '@ir-engine/spatial/src/common/functions/createWorkerFromCrossOriginURL'
import * as dat from 'dat.gui'
import { ID, UpdateMessage } from './ForcegraphMessages'

let worker: Worker

export const createWorker = async () => {
  // @ts-ignore
  const workerPath = new URL('./ForceGraphWorker.bundle.js', import.meta.url).href
  const worker = createWorkerFromCrossOriginURL(workerPath, true, { name: 'ForceGraphWorker' })

  await new Promise<void>((resolve, reject) => {
    worker.onmessage = () => {
      resolve()
    }
    worker.onerror = (error) => {
      console.error('worker error', error)
      reject(error)
    }
  })

  return worker
}

let graphCounter = 0

export const startWebworker = async (
  nodes: Array<{ id: ID }>,
  links: Array<{ source: ID; target: ID; weight: number }>,
  onData: (data: ArrayBuffer) => void
) => {
  if (!worker) {
    worker = await createWorker()
  }

  const id = graphCounter++

  /** UI */
  const gui = new dat.GUI()
  gui.domElement.style.pointerEvents = 'all'
  const folder1 = gui.addFolder('Options')
  folder1.closed = false
  const options = {
    repulsion: -10,
    distanceMax: 100,
    linkStrength: 50,
    relationship: 'exponential',
    weights1: 0.05,
    weights2: 0.1,
    weights3: 0.2,
    weights4: 0.5,
    iconSize: 1,
    restart: () => {
      update({
        restart: true,
        repulsion: repulsionProperty.getValue(),
        distanceMax: maxDistanceProperty.getValue(),
        relationship: relationshipProperty.getValue()
      })
    },
    reset: () => {
      repulsionProperty.setValue(-10)
      maxDistanceProperty.setValue(100)
      relationshipProperty.setValue('exponential')
      update({ repulsion: -10, distanceMax: 100, relationship: 'exponential' })
      // connectionCagetogriesProperties[0].setValue(0.05)
      // connectionCagetogriesProperties[1].setValue(0.1)
      // connectionCagetogriesProperties[2].setValue(0.2)
      // connectionCagetogriesProperties[3].setValue(0.5)
      options.restart()
    }
  }
  const repulsionProperty = folder1
    .add(options, 'repulsion', -100, 100)
    .onFinishChange((value) => {
      update({ repulsion: value })
      options.restart()
    })
    .name('Repulsion')
  const maxDistanceProperty = folder1
    .add(options, 'distanceMax', 0, 1000)
    .onFinishChange((value) => {
      update({ distanceMax: value })
      options.restart()
    })
    .name('Max Repulsion Distance')

  const relationshipProperty = folder1
    .add(options, 'relationship', ['equal', 'linear', 'exponential'])
    .onFinishChange((value) => {
      // link.strength(strengthFuncs[value])
      options.restart()
    })
    .name('Relationship Strength')

  // const connectionCagetogries = [1, 2, 3, 4]
  // const connectionCagetogriesProperties = connectionCagetogries.map((connection) => {
  //   return folder1
  //     .add(options, 'weights' + connection, 0, 1)
  //     .name(connection + ' Weight')
  //     .onFinishChange((value) => {
  //       linkStrengths[connection] = value
  //       options.restart()
  //     })
  // })

  folder1
    .add(options, 'iconSize', 0.1, 10)
    .name('Icon Size')
    .onChange((value) => {
      // for (const node of nodeEntities.value) getComponent(node, TransformComponent).scale.setScalar(value)
    })

  folder1.add(options, 'restart').name('Restart Simulation')
  folder1.add(options, 'reset').name('Reset Parameters')

  worker.postMessage({ id, type: 'start', nodes, links })

  const update = (properties: Omit<Omit<UpdateMessage, 'type'>, 'id'>) => {
    worker.postMessage({ id, type: 'update', ...properties })
  }
  worker.onmessage = (e) => {
    const data = e.data as ArrayBuffer
    if (data.slice(-1)[0] !== id) return
    onData(e.data)
  }

  return [
    worker,
    () => {
      worker.postMessage({ id, type: 'stop' })
      gui.destroy()
    }
  ] as const
}
