import '@hookstate/core'
import * as React from 'react'
import * as ReactDOM from 'react-dom/client'
import App from './App'
import { reactToWebComponent } from './reactToWebComponent'

const CustomElement = reactToWebComponent(App, React, ReactDOM, {
  shadow: false,
  observedProps: ['perspective', 'agent', 'source']
})

export default CustomElement
