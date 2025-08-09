import { ID, DagMessage } from './DagMessages'

interface Node {
  id: ID
  group: string
  x: number
  y: number
  z: number
}

interface Link {
  source: ID
  target: ID
  weight: number
}

interface DagLayout {
  nodes: Node[]
  links: Link[]
  nodeSpacing: number
  levelSpacing: number
  alignment: 'top' | 'center' | 'bottom'
  direction: 'horizontal' | 'vertical'
  enabledGroups: Record<string, boolean>
}

const dagLayouts = new Map<number, DagLayout>()

// DAG layout algorithm using Kahn's algorithm for topological sorting
function calculateDAGLayout(
  nodes: Array<{ id: ID; group: string }>,
  links: Array<{ source: ID; target: ID; weight: number }>,
  options: {
    nodeSpacing: number
    levelSpacing: number
    alignment: 'top' | 'center' | 'bottom'
    direction: 'horizontal' | 'vertical'
  }
): { nodes: Node[]; links: Link[] } {
  const { nodeSpacing, levelSpacing, alignment, direction } = options

  // Create adjacency list and in-degree count
  const adjList = new Map<ID, Set<ID>>()
  const inDegree = new Map<ID, number>()
  const nodeMap = new Map<ID, { id: ID; group: string }>()

  // Initialize all nodes
  nodes.forEach(node => {
    nodeMap.set(node.id, node)
    adjList.set(node.id, new Set())
    inDegree.set(node.id, 0)
  })

  // Build adjacency list and calculate in-degrees
  links.forEach(link => {
    if (adjList.has(link.source) && inDegree.has(link.target)) {
      adjList.get(link.source)!.add(link.target)
      inDegree.set(link.target, inDegree.get(link.target)! + 1)
    }
  })

  // Topological sort using Kahn's algorithm
  const levels: ID[][] = []
  const queue: ID[] = []
  const nodeLevel = new Map<ID, number>()

  // Find all nodes with in-degree 0
  inDegree.forEach((degree, nodeId) => {
    if (degree === 0) {
      queue.push(nodeId)
    }
  })

  let currentLevel = 0
  while (queue.length > 0) {
    const levelSize = queue.length
    const currentLevelNodes: ID[] = []

    for (let i = 0; i < levelSize; i++) {
      const current = queue.shift()!
      currentLevelNodes.push(current)
      nodeLevel.set(current, currentLevel)

      // Process all neighbors
      adjList.get(current)!.forEach(neighbor => {
        inDegree.set(neighbor, inDegree.get(neighbor)! - 1)
        if (inDegree.get(neighbor) === 0) {
          queue.push(neighbor)
        }
      })
    }

    levels.push(currentLevelNodes)
    currentLevel++
  }

  // Calculate positions
  const layoutNodes: Node[] = []
  
  levels.forEach((level, levelIndex) => {
    const levelNodeCount = level.length
    const totalLevelWidth = (levelNodeCount - 1) * nodeSpacing
    
    level.forEach((nodeId, nodeIndex) => {
      const node = nodeMap.get(nodeId)!
      let x: number, y: number, z: number

      if (direction === 'horizontal') {
        // Horizontal layout
        x = levelIndex * levelSpacing
        y = nodeIndex * nodeSpacing - totalLevelWidth / 2
        z = 0

        // Apply alignment
        if (alignment === 'top') {
          y = nodeIndex * nodeSpacing
        } else if (alignment === 'bottom') {
          y = -(levelNodeCount - 1 - nodeIndex) * nodeSpacing
        }
      } else {
        // Vertical layout
        x = nodeIndex * nodeSpacing - totalLevelWidth / 2
        y = -(levelIndex * levelSpacing)
        z = 0

        // Apply alignment
        if (alignment === 'top') {
          x = nodeIndex * nodeSpacing
        } else if (alignment === 'bottom') {
          x = -(levelNodeCount - 1 - nodeIndex) * nodeSpacing
        }
      }

      layoutNodes.push({
        id: nodeId,
        group: node.group,
        x,
        y,
        z
      })
    })
  })

  return {
    nodes: layoutNodes,
    links: links.map(link => ({ ...link }))
  }
}

function updateDAGLayout(id: number): void {
  const layout = dagLayouts.get(id)
  if (!layout) return

  const result = calculateDAGLayout(
    layout.nodes.map(n => ({ id: n.id, group: n.group })),
    layout.links,
    {
      nodeSpacing: layout.nodeSpacing,
      levelSpacing: layout.levelSpacing,
      alignment: layout.alignment,
      direction: layout.direction
    }
  )

  layout.nodes = result.nodes
  layout.links = result.links

  // Create output buffer: [nodes positions..., links positions...]
  const nodeCount = layout.nodes.length
  const linkCount = layout.links.length
  
  const buffer = new Float32Array(nodeCount * 3 + linkCount * 6 + 1)
  
  // Add node positions
  layout.nodes.forEach((node, i) => {
    buffer[i * 3] = node.x
    buffer[i * 3 + 1] = node.y
    buffer[i * 3 + 2] = node.z
  })
  
  // Add link positions
  const nodeMap = new Map(layout.nodes.map(n => [n.id, n]))
  layout.links.forEach((link, i) => {
    const sourceNode = nodeMap.get(link.source)
    const targetNode = nodeMap.get(link.target)
    
    if (sourceNode && targetNode) {
      const linkOffset = nodeCount * 3 + i * 6
      buffer[linkOffset] = sourceNode.x
      buffer[linkOffset + 1] = sourceNode.y
      buffer[linkOffset + 2] = sourceNode.z
      buffer[linkOffset + 3] = targetNode.x
      buffer[linkOffset + 4] = targetNode.y
      buffer[linkOffset + 5] = targetNode.z
    }
  })
  
  // Add id at the end
  buffer[buffer.length - 1] = id
  
  ;(self as any).postMessage(buffer.buffer, [buffer.buffer])
}

self.onmessage = (event) => {
  const message = event.data as DagMessage

  switch (message.type) {
    case 'start': {
      const layout: DagLayout = {
        nodes: message.nodes.map(n => ({ ...n, x: 0, y: 0, z: 0 })),
        links: [...message.links],
        nodeSpacing: 50,
        levelSpacing: 100,
        alignment: 'center',
        direction: 'horizontal',
        enabledGroups: {}
      }
      
      // Initialize enabled groups
      const groups = new Set(message.nodes.map(n => n.group))
      groups.forEach(group => {
        layout.enabledGroups[group] = true
      })
      
      dagLayouts.set(message.id, layout)
      updateDAGLayout(message.id)
      break
    }
    
    case 'update': {
      const layout = dagLayouts.get(message.id)
      if (!layout) break
      
      if (message.nodeSpacing !== undefined) {
        layout.nodeSpacing = message.nodeSpacing
      }
      if (message.levelSpacing !== undefined) {
        layout.levelSpacing = message.levelSpacing
      }
      if (message.alignment !== undefined) {
        layout.alignment = message.alignment
      }
      if (message.direction !== undefined) {
        layout.direction = message.direction
      }
      if (message.enabledGroups !== undefined) {
        layout.enabledGroups = { ...message.enabledGroups }
      }
      
      updateDAGLayout(message.id)
      break
    }
    
    case 'stop': {
      dagLayouts.delete(message.id)
      break
    }
  }
}

// Send ready message
;(self as any).postMessage('ready')
