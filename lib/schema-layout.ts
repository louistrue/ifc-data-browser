import ELK from "elkjs"
import type { Edge, Node } from "reactflow"

import type { SchemaNodeData } from "@/lib/schema"

const DEFAULT_NODE_WIDTH = 260
const HEADER_HEIGHT = 48
const ROW_HEIGHT = 26

export async function applyAutoLayout(
  nodes: Node<SchemaNodeData>[],
  edges: Edge[],
): Promise<{ nodes: Node<SchemaNodeData>[]; edges: Edge[] }> {
  if (nodes.length === 0) {
    return { nodes, edges }
  }

  const elk = new ELK()
  const graph = {
    id: "schema",
    layoutOptions: {
      "elk.direction": "RIGHT",
      "elk.layered.spacing.nodeNodeBetweenLayers": "80",
      "elk.spacing.nodeNode": "40",
      "elk.layered.spacing.edgeNodeBetweenLayers": "60",
    },
    children: nodes.map((node) => ({
      id: node.id,
      width: DEFAULT_NODE_WIDTH,
      height: HEADER_HEIGHT + node.data.table.columns.length * ROW_HEIGHT,
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
    })),
  }

  try {
    const layout = await elk.layout(graph)
    const positionMap = new Map<string, { x: number; y: number }>()

    layout.children?.forEach((child) => {
      if (child.id) {
        positionMap.set(child.id, {
          x: child.x ?? 0,
          y: child.y ?? 0,
        })
      }
    })

    const laidOutNodes = nodes.map((node) => {
      const pos = positionMap.get(node.id)
      return pos
        ? {
            ...node,
            position: pos,
          }
        : node
    })

    return { nodes: laidOutNodes, edges }
  } catch (error) {
    console.error("[schema] Failed to run auto layout", error)
    return { nodes, edges }
  }
}
