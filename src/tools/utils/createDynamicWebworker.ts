/**
 * Takes a string of javascript code and returns a worker that can be used to call the function
 *
 * @param functionString
 * @returns
 */
export const createDynamicWebworker = async (functionString: string) => {
  const functionName = functionString.match(/function\s+(\w+)/)?.[1] || 'transform'

  const fnString = `
${functionString}
self.postMessage({});
self.onmessage = function(e) {
  try {
    const output = ${functionName}(e.data);
    self.postMessage({ output });
  } catch (e) {
    self.postMessage({ error: e.message });
  }
};
`

  const blob = new Blob([fnString], { type: 'application/javascript' })

  const workerUrl = URL.createObjectURL(blob)

  const worker = new Worker(workerUrl)

  // Wait for the worker to be ready
  await new Promise<void>((resolve) => {
    worker.onmessage = () => resolve()
  })

  return {
    call: (data: object) =>
      new Promise<object>((resolve, reject) => {
        worker.onmessage = (e) => {
          if (e.data.error) {
            reject(new Error(e.data.error))
          } else {
            resolve(e.data.output)
          }
        }
        worker.onerror = (e) => {
          reject(e)
        }
        worker.postMessage(data)
      }),

    terminate: () => {
      worker.terminate()
      URL.revokeObjectURL(workerUrl)
    }
  }
}
