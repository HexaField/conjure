/*
CPAL-1.0 License

The contents of this file are subject to the Common Public Attribution License
Version 1.0. (the "License"); you may not use this file except in compliance
with the License. You may obtain a copy of the License at
https://github.com/ir-engine/ir-engine/blob/dev/LICENSE.
The License is based on the Mozilla Public License Version 1.1, but Sections 14
and 15 have been added to cover use of software over a computer network and 
provide for limited attribution for the Original Developer. In addition, 
Exhibit A has been modified to be consistent with Exhibit B.

Software distributed under the License is distributed on an "AS IS" basis,
WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License for the
specific language governing rights and limitations under the License.

The Original Code is Infinite Reality Engine.

The Original Developer is the Initial Developer. The Initial Developer of the
Original Code is the Infinite Reality Engine team.

All portions of the code written by the Infinite Reality Engine team are Copyright © 2021-2023 
Infinite Reality Engine. All Rights Reserved.
*/

import React, { lazy, Suspense } from 'react'
import { Route, Router, Routes } from 'react-router-dom'
import { createRoot } from 'react-dom/client'

import '@ir-engine/client/src/themes/base.css'
import '@ir-engine/client/src/themes/components.css'
import '@ir-engine/client/src/themes/utilities.css'

import { createHyperStore, getMutableState } from '@ir-engine/hyperflux'

import ClientErrorBoundary from '@ir-engine/client-core/src/common/components/ClientErrorBoundary'
import { BrowserRouter, history } from '@ir-engine/client-core/src/common/services/RouterService'

// tslint:disable:ordered-imports
/** @ts-ignore */
globalThis.process = { env: { ...(import.meta as any).env, APP_ENV: (import.meta as any).env.MODE } }

// ensure config is imported
import '@ir-engine/common/src/config'
createHyperStore()

// import { API } from '@ir-engine/common/src/API'
// import { createAd4mAPIAdapter } from './ad4m/createAd4mAPIAdapter'

// API.instance = createAd4mAPIAdapter()

const CustomLocationPage = lazy(() => import('./CustomLocationPage'))
const ForceGraph = lazy(() => import('./tools/graph/ForceGraphRaw'))
const DataGrapher = lazy(() => import('./tools/graph/DataGrapher'))
const DataPipeline = lazy(() => import('./tools/graph/DataPipeline'))
const LLMGrapher = lazy(() => import('./tools/App'))

const App = () => {
  return (
    <ClientErrorBoundary>
      <BrowserRouter history={history}>
        <Routes>
          <Route
            key="default"
            path="/pipeline"
            element={
              <Suspense>
                <DataPipeline />
              </Suspense>
            }
          />
          <Route
            key="default"
            path="/forcegraph"
            element={
              <Suspense>
                <ForceGraph />
              </Suspense>
            }
          />
          <Route
            key="default"
            path="/llm"
            element={
              <Suspense>
                <LLMGrapher />
              </Suspense>
            }
          />
          <Route
            key="default"
            path="/graph"
            element={
              <Suspense>
                <DataGrapher />
              </Suspense>
            }
          />
          <Route
            key="default"
            path="/*"
            element={
              <Suspense>
                <CustomLocationPage />
              </Suspense>
            }
          />
        </Routes>
      </BrowserRouter>
    </ClientErrorBoundary>
  )
}

const container = document.getElementById('root')
const root = createRoot(container!)
root.render(<App />)
