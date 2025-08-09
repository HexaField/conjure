// Example usage of the DAG visualization
import { DagSchema } from './index'

// Example DAG data representing a simple workflow
const exampleDAGData = {
  nodes: [
    { id: 'start', label: 'Start', group: 'control' },
    { id: 'task1', label: 'Process Data', group: 'processing' },
    { id: 'task2', label: 'Validate Input', group: 'processing' },
    { id: 'decision', label: 'Check Quality', group: 'decision' },
    { id: 'retry', label: 'Retry Process', group: 'processing' },
    { id: 'finalize', label: 'Finalize Results', group: 'output' },
    { id: 'end', label: 'End', group: 'control' }
  ],
  edges: [
    { source: 'start', target: 'task2', weight: 1 },
    { source: 'task2', target: 'task1', weight: 1 },
    { source: 'task1', target: 'decision', weight: 1 },
    { source: 'decision', target: 'finalize', weight: 1 },
    { source: 'decision', target: 'retry', weight: 0.3 },
    { source: 'retry', target: 'task1', weight: 1 },
    { source: 'finalize', target: 'end', weight: 1 }
  ]
}

// The DAG visualization will automatically:
// 1. Calculate topological ordering using Kahn's algorithm
// 2. Arrange nodes in hierarchical levels
// 3. Apply the selected layout direction and alignment
// 4. Render interactive 3D visualization with Three.js

// Expected layout (horizontal direction):
// Level 0: start
// Level 1: task2
// Level 2: task1, retry (retry will be positioned appropriately)
// Level 3: decision
// Level 4: finalize
// Level 5: end
