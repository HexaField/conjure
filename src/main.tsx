import React, { lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { Route, Routes } from 'react-router-dom'

import '@ir-engine/client/src/themes/base.css'
import '@ir-engine/client/src/themes/components.css'
import '@ir-engine/client/src/themes/utilities.css'

import { createHyperStore } from '@ir-engine/hyperflux'

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
const LLMGrapher = lazy(() => import('./tools/App'))

const App = () => {
  return (
    <ClientErrorBoundary>
      <BrowserRouter history={history}>
        <Routes>
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
