import { createWorkerFromCrossOriginURL } from '@ir-engine/spatial/src/common/functions/createWorkerFromCrossOriginURL'
import { ID, UpdateMessage } from './ForcegraphMessages'

let worker: Worker

export const createWorker = () => {
  // @ts-ignore
  const workerPath = new URL('./ForceGraphWorker.bundle.js', import.meta.url).href
  const worker = createWorkerFromCrossOriginURL(workerPath, true, { name: 'ForceGraphWorker' })
  return worker
}

let graphCounter = 0

export const startWebworker = (
  nodes: Array<{ id: ID; group: string }>,
  links: Array<{ source: ID; target: ID; weight: number }>,
  onData: (data: ArrayBuffer) => void
) => {
  if (!worker) {
    worker = createWorker()
  }

  const readyPromise = new Promise<void>((resolve, reject) => {
    worker.onmessage = () => {
      resolve()
    }
    worker.onerror = (error) => {
      console.error('worker error', error)
      reject(error)
    }
  })

  const id = graphCounter++

  readyPromise.then(() => {
    worker.postMessage({ id, type: 'start', nodes, links })
  })

  const update = (properties: Omit<Omit<UpdateMessage, 'type'>, 'id'>) => {
    readyPromise.then(() => {
      worker.postMessage({ id, type: 'update', ...properties })
    })
  }
  const destroy = () => {
    readyPromise.then(() => {
      worker.postMessage({ id, type: 'stop' })
    })
  }
  readyPromise.then(() => {
    worker.onmessage = (e) => {
      const data = e.data as ArrayBuffer
      if (data.slice(-1)[0] !== id) return
      onData(e.data)
    }
  })

  return {
    worker,
    id,
    readyPromise,
    update,
    destroy
  }
}
