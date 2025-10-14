import type { Edge, Node } from "reactflow"
import ELK from "elkjs/lib/elk.bundled"

import type { TableNodeData } from "./schema"

const elk = new ELK()

export const TABLE_NODE_WIDTH = 260
export const TABLE_NODE_HEADER_HEIGHT = 44
export const TABLE_NODE_ROW_HEIGHT = 28

export async function autoLayout(
  nodes: Node<TableNodeData>[],
  edges: Edge[],
): Promise<{ nodes: Node<TableNodeData>[]; edges: Edge[] }> {
  if (!nodes.length) {
    return { nodes, edges }
  }

  const elkGraph = {
    id: "schema",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "RIGHT",
      "elk.spacing.nodeNode": "80",
      "elk.layered.spacing.nodeNodeBetweenLayers": "80",
      "elk.layered.spacing.edgeNodeBetweenLayers": "60",
    },
    children: nodes.map((node) => ({
      id: node.id,
      width: TABLE_NODE_WIDTH,
      height: Math.max(
        TABLE_NODE_HEADER_HEIGHT + (node.data?.table?.columns?.length ?? 0) * TABLE_NODE_ROW_HEIGHT,
        80,
      ),
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
    })),
  }

  const layout = await elk.layout(elkGraph as any)

  const positions = new Map<string, { x: number; y: number }>()
  layout.children?.forEach((child: any) => {
    const x = typeof child.x === "number" ? child.x : 0
    const y = typeof child.y === "number" ? child.y : 0
    positions.set(child.id, { x, y })
  })

  const layoutedNodes = nodes.map((node) => {
    const pos = positions.get(node.id)
    return pos ? { ...node, position: pos } : node
  })

  return {
    nodes: layoutedNodes,
    edges,
  }
}
