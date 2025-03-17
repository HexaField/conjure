export type ID = string | number

export type StartMessage = {
  id: number
  type: 'start'
  nodes: Array<{ id: ID; group: string }>
  links: Array<{ source: ID; target: ID; weight: number }>
}

export type UpdateMessage = {
  id: number
  type: 'update'
  restart?: boolean
  repulsion?: number
  distanceMax?: number
  relationship?: 'equal' | 'linear' | 'exponential' | 'quadratic'
  enabledGroups?: Record<string, boolean>
}

export type StopMessage = {
  id: number
  type: 'stop'
}

export type ForcegraphMessage = StartMessage | UpdateMessage | StopMessage
