import '@ir-engine/client/src/engine'

import { Resizable } from 're-resizable'
import React, { useEffect } from 'react'
import { HiChevronLeft, HiChevronRight } from 'react-icons/hi'
import { Vector3 } from 'three'

import Debug from '@ir-engine/client-core/src/components/Debug'
import { useDraggable } from '@ir-engine/client-core/src/hooks/useDraggable'
import { createEntity, EntityTreeComponent, removeEntity, setComponent } from '@ir-engine/ecs'
import { getMutableState, getState, useHookstate, useMutableState, useReactiveRef } from '@ir-engine/hyperflux'
import { AmbientLightComponent, ReferenceSpaceState, TransformComponent } from '@ir-engine/spatial'
import { CameraOrbitComponent } from '@ir-engine/spatial/src/camera/components/CameraOrbitComponent'
import { NameComponent } from '@ir-engine/spatial/src/common/NameComponent'
import { useSpatialEngine } from '@ir-engine/spatial/src/initializeEngine'
import { setVisibleComponent } from '@ir-engine/spatial/src/renderer/components/VisibleComponent'
import { useEngineCanvas } from '@ir-engine/spatial/src/renderer/functions/useEngineCanvas'
import { RendererState } from '@ir-engine/spatial/src/renderer/RendererState'
import { Button } from '@ir-engine/ui'

import GithubLink from './components/GithubLink'
import { PipelineView } from './views/PipelineView'
import SchemaView from './views/SchemaView'
import ToolView from './views/ToolView'

import Tabs from './components/Tabs'

import { P2P_API } from '../api/CRUD'
import './graph/forcegraph/ForceGraph'

const tabs = [
  { label: 'Pipelines', value: 'pipeline' },
  { label: 'Tools', value: 'tool' },
  { label: 'Schemas', value: 'schema' }
]

function ToolMenus(): JSX.Element {
  const tab = useHookstate('pipeline')

  return (
    <div className="pointer-events-auto bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Tabs tabs={tabs} onChange={tab.set} value={tab.value} />
      <div className="mx-auto max-w-4xl space-y-6">
        {tab.value === 'pipeline' && <PipelineView />}
        {tab.value === 'tool' && <ToolView />}
        {tab.value === 'schema' && <SchemaView />}
      </div>
    </div>
  )
}

function ToolUI() {
  const showMappingUI = useHookstate(true)
  const size = useHookstate<{ width: number; height: number }>(() => {
    const w = Number.parseInt(localStorage.getItem('toolUIWidth') || '')
    const h = Number.parseInt(localStorage.getItem('toolUIHeight') || '')
    return {
      width: Number.isFinite(w) ? w : Math.min(window.innerWidth * 0.6, 1000),
      height: Number.isFinite(h) ? h : window.innerHeight * 0.8
    }
  })

  const startX = Number.parseInt(localStorage.getItem('toolUIPosX') || '')
  const startY = Number.parseInt(localStorage.getItem('toolUIPosY') || '')

  useDraggable({
    targetId: 'toolui-container',
    placerId: 'toolui-draggable-placer',
    targetStartX: Number.isFinite(startX) ? startX : 8,
    targetStartY: Number.isFinite(startY) ? startY : 8
  })

  // Persist position on mouseup
  useEffect(() => {
    const save = () => {
      const target = document.getElementById('toolui-container') as HTMLElement | null
      if (!target) return
      localStorage.setItem('toolUIPosX', String(target.offsetLeft))
      localStorage.setItem('toolUIPosY', String(target.offsetTop))
    }
    window.addEventListener('mouseup', save)
    return () => window.removeEventListener('mouseup', save)
  }, [])

  return (
    <div className="pointer-events-none fixed inset-0 z-[50]">
      <div id="toolui-container" className="pointer-events-auto absolute">
        {!showMappingUI.value && (
          <div className="h-full w-full overflow-auto rounded-lg bg-white p-4 shadow-lg">
            <Button className="rounded-lg bg-white p-4" variant="tertiary" onClick={() => showMappingUI.set(true)}>
              <HiChevronRight className="text-theme-primary pointer-events-none place-self-center" />
            </Button>
          </div>
        )}
        <div className="relative">
          <Resizable
            className="rounded-lg bg-white shadow-lg"
            size={{ width: size.value.width, height: size.value.height }}
            enable={{ right: true, bottom: true, bottomRight: true }}
            minWidth={600}
            minHeight={200}
            onResizeStop={(_e, _dir, _ref, d) => {
              const newWidth = size.value.width + d.width
              const newHeight = size.value.height + d.height
              size.set({ width: newWidth, height: newHeight })
              localStorage.setItem('toolUIWidth', String(newWidth))
              localStorage.setItem('toolUIHeight', String(newHeight))
            }}
            style={{ display: showMappingUI.value ? 'block' : 'none', position: 'relative' }}
          >
            <div className="h-full w-full overflow-auto p-4">
              <div id="toolui-draggable-placer" className="mb-3 grid grid-cols-[auto,1fr,auto] items-center gap-0.5">
                {showMappingUI.value && (
                  <Button
                    className="rounded-lg bg-white p-4"
                    variant="tertiary"
                    onClick={() => showMappingUI.set(false)}
                  >
                    <HiChevronLeft className="text-theme-primary pointer-events-none place-self-center" />
                  </Button>
                )}
                <h2 className="text-center text-2xl font-semibold">Tool Menu</h2>
                {showMappingUI.value && (
                  <div className="pointer-events-none opacity-0">
                    <Button className="rounded-lg bg-white p-4" variant="tertiary">
                      <HiChevronLeft className="pointer-events-none place-self-center" />
                    </Button>
                  </div>
                )}
              </div>
              <ToolMenus />
            </div>
          </Resizable>
        </div>
      </div>
    </div>
  )
}

export default function GraphPage() {
  const [ref, setRef] = useReactiveRef()

  const storageMethod = useHookstate<'local' | 'ADAM'>('ADAM')

  useSpatialEngine()
  useEngineCanvas(ref)

  const { originEntity, viewerEntity } = useMutableState(ReferenceSpaceState).value

  useEffect(() => {
    if (storageMethod.value === 'ADAM') {
      import('../ad4m/useADAM').then((module) => {
        // get agent state to initialize agent
        getState(module.AgentState)
      })
    } else {
      import('../api/local').then((module) => {
        P2P_API.client = module.LocalBlobAPI
        getMutableState(P2P_API).ready.set(true)
      })
    }
  }, [])

  useEffect(() => {
    if (!originEntity || !viewerEntity) return

    /** Set Up Scene */
    document.body.style.backgroundColor = 'black'
    setComponent(viewerEntity, TransformComponent, {
      position: new Vector3(10, 10, 20)
    })
    setComponent(viewerEntity, CameraOrbitComponent)
    getMutableState(RendererState).useShadows.set(false)

    const ambientLightEntity = createEntity()
    setComponent(ambientLightEntity, NameComponent, 'Ambient Light')
    setComponent(ambientLightEntity, EntityTreeComponent, { parentEntity: originEntity })
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
      <ToolUI />
      <GithubLink />
      <Debug />
    </>
  )
}
