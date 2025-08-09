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
  nodeSpacing?: number
  levelSpacing?: number
  alignment?: 'top' | 'center' | 'bottom'
  direction?: 'horizontal' | 'vertical'
  enabledGroups?: Record<string, boolean>
}

export type StopMessage = {
  id: number
  type: 'stop'
}

export type DagMessage = StartMessage | UpdateMessage | StopMessage
