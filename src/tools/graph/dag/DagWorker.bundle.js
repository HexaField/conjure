// src/tools/graph/dag/DagWorker.ts
var dagLayouts = /* @__PURE__ */ new Map();
function calculateDAGLayout(nodes, links, options) {
  const { nodeSpacing, levelSpacing, alignment, direction } = options;
  const adjList = /* @__PURE__ */ new Map();
  const inDegree = /* @__PURE__ */ new Map();
  const nodeMap = /* @__PURE__ */ new Map();
  nodes.forEach((node) => {
    nodeMap.set(node.id, node);
    adjList.set(node.id, /* @__PURE__ */ new Set());
    inDegree.set(node.id, 0);
  });
  links.forEach((link) => {
    if (adjList.has(link.source) && inDegree.has(link.target)) {
      adjList.get(link.source).add(link.target);
      inDegree.set(link.target, inDegree.get(link.target) + 1);
    }
  });
  const levels = [];
  const queue = [];
  const nodeLevel = /* @__PURE__ */ new Map();
  inDegree.forEach((degree, nodeId) => {
    if (degree === 0) {
      queue.push(nodeId);
    }
  });
  let currentLevel = 0;
  while (queue.length > 0) {
    const levelSize = queue.length;
    const currentLevelNodes = [];
    for (let i = 0; i < levelSize; i++) {
      const current = queue.shift();
      currentLevelNodes.push(current);
      nodeLevel.set(current, currentLevel);
      adjList.get(current).forEach((neighbor) => {
        inDegree.set(neighbor, inDegree.get(neighbor) - 1);
        if (inDegree.get(neighbor) === 0) {
          queue.push(neighbor);
        }
      });
    }
    levels.push(currentLevelNodes);
    currentLevel++;
  }
  const layoutNodes = [];
  levels.forEach((level, levelIndex) => {
    const levelNodeCount = level.length;
    const totalLevelWidth = (levelNodeCount - 1) * nodeSpacing;
    level.forEach((nodeId, nodeIndex) => {
      const node = nodeMap.get(nodeId);
      let x, y, z;
      if (direction === "horizontal") {
        x = levelIndex * levelSpacing;
        y = nodeIndex * nodeSpacing - totalLevelWidth / 2;
        z = 0;
        if (alignment === "top") {
          y = nodeIndex * nodeSpacing;
        } else if (alignment === "bottom") {
          y = -(levelNodeCount - 1 - nodeIndex) * nodeSpacing;
        }
      } else {
        x = nodeIndex * nodeSpacing - totalLevelWidth / 2;
        y = -(levelIndex * levelSpacing);
        z = 0;
        if (alignment === "top") {
          x = nodeIndex * nodeSpacing;
        } else if (alignment === "bottom") {
          x = -(levelNodeCount - 1 - nodeIndex) * nodeSpacing;
        }
      }
      layoutNodes.push({
        id: nodeId,
        group: node.group,
        x,
        y,
        z
      });
    });
  });
  return {
    nodes: layoutNodes,
    links: links.map((link) => ({ ...link }))
  };
}
function updateDAGLayout(id) {
  const layout = dagLayouts.get(id);
  if (!layout)
    return;
  const result = calculateDAGLayout(
    layout.nodes.map((n) => ({ id: n.id, group: n.group })),
    layout.links,
    {
      nodeSpacing: layout.nodeSpacing,
      levelSpacing: layout.levelSpacing,
      alignment: layout.alignment,
      direction: layout.direction
    }
  );
  layout.nodes = result.nodes;
  layout.links = result.links;
  const nodeCount = layout.nodes.length;
  const linkCount = layout.links.length;
  const buffer = new Float32Array(nodeCount * 3 + linkCount * 6 + 1);
  layout.nodes.forEach((node, i) => {
    buffer[i * 3] = node.x;
    buffer[i * 3 + 1] = node.y;
    buffer[i * 3 + 2] = node.z;
  });
  const nodeMap = new Map(layout.nodes.map((n) => [n.id, n]));
  layout.links.forEach((link, i) => {
    const sourceNode = nodeMap.get(link.source);
    const targetNode = nodeMap.get(link.target);
    if (sourceNode && targetNode) {
      const linkOffset = nodeCount * 3 + i * 6;
      buffer[linkOffset] = sourceNode.x;
      buffer[linkOffset + 1] = sourceNode.y;
      buffer[linkOffset + 2] = sourceNode.z;
      buffer[linkOffset + 3] = targetNode.x;
      buffer[linkOffset + 4] = targetNode.y;
      buffer[linkOffset + 5] = targetNode.z;
    }
  });
  buffer[buffer.length - 1] = id;
  self.postMessage(buffer.buffer, [buffer.buffer]);
}
self.onmessage = (event) => {
  const message = event.data;
  switch (message.type) {
    case "start": {
      const layout = {
        nodes: message.nodes.map((n) => ({ ...n, x: 0, y: 0, z: 0 })),
        links: [...message.links],
        nodeSpacing: 50,
        levelSpacing: 100,
        alignment: "center",
        direction: "horizontal",
        enabledGroups: {}
      };
      const groups = new Set(message.nodes.map((n) => n.group));
      groups.forEach((group) => {
        layout.enabledGroups[group] = true;
      });
      dagLayouts.set(message.id, layout);
      updateDAGLayout(message.id);
      break;
    }
    case "update": {
      const layout = dagLayouts.get(message.id);
      if (!layout)
        break;
      if (message.nodeSpacing !== void 0) {
        layout.nodeSpacing = message.nodeSpacing;
      }
      if (message.levelSpacing !== void 0) {
        layout.levelSpacing = message.levelSpacing;
      }
      if (message.alignment !== void 0) {
        layout.alignment = message.alignment;
      }
      if (message.direction !== void 0) {
        layout.direction = message.direction;
      }
      if (message.enabledGroups !== void 0) {
        layout.enabledGroups = { ...message.enabledGroups };
      }
      updateDAGLayout(message.id);
      break;
    }
    case "stop": {
      dagLayouts.delete(message.id);
      break;
    }
  }
};
self.postMessage("ready");
