import '@ir-engine/client/src/engine'

import { getMutableState, NO_PROXY, useHookstate, useMutableState, useReactiveRef } from '@ir-engine/hyperflux'
import { useSpatialEngine } from '@ir-engine/spatial/src/initializeEngine'
import { useEngineCanvas } from '@ir-engine/spatial/src/renderer/functions/useEngineCanvas'

import React, { useEffect } from 'react'

import Debug from '@ir-engine/client-core/src/components/Debug'
import { createEntity, removeEntity, setComponent } from '@ir-engine/ecs'
import { AmbientLightComponent, ReferenceSpaceState, TransformComponent } from '@ir-engine/spatial'
import { CameraOrbitComponent } from '@ir-engine/spatial/src/camera/components/CameraOrbitComponent'
import { NameComponent } from '@ir-engine/spatial/src/common/NameComponent'
import { setVisibleComponent } from '@ir-engine/spatial/src/renderer/components/VisibleComponent'
import { RendererState } from '@ir-engine/spatial/src/renderer/RendererState'
import { Button } from '@ir-engine/ui'
import { HiChevronLeft, HiChevronRight } from 'react-icons/hi'
import { Vector3 } from 'three'
import { JSONPreview } from './components/JSONPreview'

import './forcegraph/ForceGraph'

import { useSearchParam } from '../../utils/useSearchParam'
import { DataToolRegistry, Tool } from './DataState'
import { DnDURLAndFileUpload } from './MappingUI'

export default function Template() {
  const [ref, setRef] = useReactiveRef()

  useSpatialEngine()
  useEngineCanvas(ref)

  const { originEntity, viewerEntity } = useMutableState(ReferenceSpaceState).value

  useEffect(() => {
    if (!originEntity || !viewerEntity) return

    /** Set Up Scene */
    document.body.style.backgroundColor = 'black'
    setComponent(viewerEntity, TransformComponent, {
      position: new Vector3(10, 10, 20)
    })
    setComponent(viewerEntity, CameraOrbitComponent, { isOrbiting: true })
    getMutableState(RendererState).useShadows.set(false)

    const ambientLightEntity = createEntity()
    setComponent(ambientLightEntity, NameComponent, 'Ambient Light')
    setComponent(ambientLightEntity, AmbientLightComponent)
    setVisibleComponent(ambientLightEntity, true)

    return () => {
      document.body.style.backgroundColor = 'white'
      removeEntity(ambientLightEntity)
    }
  }, [originEntity, viewerEntity])

  return (
    <>
      <div ref={setRef} style={{ width: '100%', height: '100%', position: 'absolute' }} />
      <Pipeline />
      <Debug />
    </>
  )
}
/**
 * @todo
 * - pipeline needs two input fields: a pipeline name and input data
 */
const Pipeline = () => {
  const showMappingUI = useHookstate(true)
  const currentPipeline = useHookstate('')
  const pipeline = useMutableState(DataToolRegistry).get(NO_PROXY)[currentPipeline.value] as Tool<true>

  const pipelineArgs = useHookstate({ type: null as string | null, sources: [] as string[], mapping: {} })
  const loading = useHookstate(false)

  useEffect(() => {
    if (!pipelineArgs.type.value || !pipelineArgs.sources.value.length) return
    loading.set(true)
    if (!pipeline) return
    pipeline.implementation(pipelineArgs.get(NO_PROXY)).then(() => {
      loading.set(false)
      showMappingUI.set(false)
    })
  }, [pipeline, pipelineArgs])

  const loadArgsFile = (file: string) => {
    fetch(file)
      .then((response) => response.json())
      .then((data) => {
        pipelineArgs.set(data)
      })
      .catch((error) => {
        console.error(error)
      })
  }

  const inputField = useHookstate(new URLSearchParams(window.location.search).get('args') || '')

  // on mout, load the args file if it exists
  useEffect(() => {
    if (inputField.value) loadArgsFile(inputField.value)
  }, [])

  useSearchParam('args', inputField.value.startsWith('blob://') ? '' : inputField.value)

  return (
    <div className="pointer-events-auto z-[10] h-fit w-fit overflow-auto overflow-x-auto overflow-y-auto rounded-lg bg-white p-4">
      <div className="flex flex-row p-4">
        <Button
          className="p-4"
          variant="tertiary"
          style={{ top: '10px', left: showMappingUI.value ? '310px' : '10px' }}
          onClick={() => showMappingUI.set(!showMappingUI.value)}
        >
          {showMappingUI.value ? (
            <HiChevronLeft className="text-theme-primary pointer-events-none place-self-center" />
          ) : (
            <HiChevronRight className="text-theme-primary pointer-events-none place-self-center" />
          )}
        </Button>
        <div
          className="h-full overflow-auto overflow-y-auto p-4"
          style={{ display: showMappingUI.value ? 'block' : 'none' }}
        >
          {pipeline && <h2 className="mb-4 text-2xl font-semibold">{pipeline.label}</h2>}
          {loading.value && <div className="rounded-r bg-gray-200 p-2">Loading {inputField.value}...</div>}
          <DnDURLAndFileUpload selectedURL={inputField.value} onChange={inputField.set} />
          <Button className="rounded-r" variant="primary" onClick={() => loadArgsFile(inputField.value.trim())}>
            Confirm
          </Button>
          <JSONPreview json={pipelineArgs.get(NO_PROXY)} title="Pipeline" />
        </div>
      </div>
    </div>
  )
}
