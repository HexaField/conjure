import { defineState, getMutableState, NO_PROXY, none, useMutableState } from '@ir-engine/hyperflux'
import React, { useEffect } from 'react'
import { P2P_API } from '../../api/CRUD'
import { contentHash } from '../json-schema/contentHash'

export type PipelineGraph = {
  nodes: any[]
  edges: any[]
  meta?: Record<string, any>
}

export type Pipeline = {
  hash: string
  label: string
  description: string
  graph: PipelineGraph
}

export const PIPELINE_PREDICATE = 'conjure://pipeline'

export const PipelineRegistry = defineState({
  name: 'hexafield.conjure.PipelineRegistry',
  initial: { pipelines: {} as Record<string, Pipeline> },

  register: (pipeline: Omit<Pipeline, 'hash'>) => {
    const hash = contentHash({
      label: pipeline.label,
      description: pipeline.description,
      graph: pipeline.graph
    })
    const payload: Pipeline = { ...pipeline, hash }
    getMutableState(PipelineRegistry).pipelines[hash].set(payload)
    return hash
  },

  forget: (hash: string) => {
    getMutableState(PipelineRegistry).pipelines[hash].set(none)
    if (!P2P_API.client) return
    P2P_API.client.delete({ source: hash, predicate: PIPELINE_PREDICATE }).then(async () => {
      console.log('deleted pipeline:', hash)
    })
  },

  reactor: () => {
    const pipelineState = useMutableState(PipelineRegistry).pipelines
    const apiReady = useMutableState(P2P_API).ready.value

    useEffect(() => {
      if (!apiReady) return
      P2P_API.client.find({ predicate: PIPELINE_PREDICATE }).then((sources) => {
        sources.forEach(async (source) => {
          P2P_API.client
            .get({ source, predicate: PIPELINE_PREDICATE })
            .then(async (response: object) => {
              if (!response) return
              const { label, description, graph } = response as Pipeline
              PipelineRegistry.register({ label, description, graph })
            })
            .catch((e) => {
              console.error('Failed to retrieve pipeline:', e)
            })
        })
      })
    }, [apiReady])

    if (!apiReady) return null

    return (
      <>
        {pipelineState.keys.map((key) => (
          <SyncPipeline key={key} hash={key} />
        ))}
      </>
    )
  }
})

const SyncPipeline = ({ hash }: { hash: string }) => {
  const pipeline = useMutableState(PipelineRegistry).pipelines[hash].get(NO_PROXY)

  useEffect(() => {
    P2P_API.client.has({ source: hash, predicate: PIPELINE_PREDICATE }).then(async (exists) => {
      if (exists) return
      P2P_API.client
        .create({
          predicate: PIPELINE_PREDICATE,
          source: hash,
          target: {
            label: pipeline.label,
            description: pipeline.description,
            graph: pipeline.graph
          }
        })
        .catch((e) => {
          console.error('Failed to create pipeline:', e)
        })
    })
  }, [JSON.stringify(pipeline)])

  return null
}
