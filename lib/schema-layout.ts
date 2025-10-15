import ELK from "elkjs"
import type { Edge, Node } from "reactflow"

import type { SchemaNodeData } from "@/lib/schema"
import { createIfcGroups, sortNodesWithinCategories, getCategorySpacing, type IfcGroup } from "@/lib/schema-grouping"

const DEFAULT_NODE_WIDTH = 280
const HEADER_HEIGHT = 48
const ROW_HEIGHT = 28

export type LayoutAlgorithm = 'hierarchical' | 'force' | 'circular' | 'grid'

export async function applyLayout(
  nodes: Node<SchemaNodeData>[],
  edges: Edge[],
  algorithm: LayoutAlgorithm = 'hierarchical'
): Promise<{ nodes: Node<SchemaNodeData>[]; edges: Edge[] }> {
  switch (algorithm) {
    case 'hierarchical':
      return applyHierarchicalLayout(nodes, edges)
    case 'force':
      return applyForceDirectedLayout(nodes, edges)
    case 'circular':
      return applyCircularLayout(nodes, edges)
    case 'grid':
      return applyGridLayout(nodes, edges)
    default:
      return applyHierarchicalLayout(nodes, edges)
  }
}

// Legacy function for backward compatibility
export async function applyAutoLayout(
  nodes: Node<SchemaNodeData>[],
  edges: Edge[],
): Promise<{ nodes: Node<SchemaNodeData>[]; edges: Edge[] }> {
  return applyHierarchicalLayout(nodes, edges)
}

/**
 * Hierarchical layout with IFC grouping
 */
export async function applyHierarchicalLayout(
  nodes: Node<SchemaNodeData>[],
  edges: Edge[],
): Promise<{ nodes: Node<SchemaNodeData>[]; edges: Edge[] }> {
  if (nodes.length === 0) {
    return { nodes, edges }
  }

  const elk = new ELK()
  const groups = sortNodesWithinCategories(createIfcGroups(nodes))

  console.log('[Layout] Applying hierarchical layout with groups:', groups.map(g => ({ name: g.name, count: g.nodes.length })))

  const graph = {
    id: "schema",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "RIGHT",
      "elk.layered.spacing.nodeNodeBetweenLayers": "120",
      "elk.spacing.nodeNode": "60",
      "elk.layered.spacing.edgeNodeBetweenLayers": "80",
      "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
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
    console.error("[schema] Failed to run hierarchical layout", error)
    return { nodes, edges }
  }
}

/**
 * Force-directed layout for organic arrangement
 */
export async function applyForceDirectedLayout(
  nodes: Node<SchemaNodeData>[],
  edges: Edge[],
): Promise<{ nodes: Node<SchemaNodeData>[]; edges: Edge[] }> {
  if (nodes.length === 0) {
    return { nodes, edges }
  }

  const elk = new ELK()

  console.log('[Layout] Applying force-directed layout')

  const graph = {
    id: "schema",
    layoutOptions: {
      "elk.algorithm": "force",
      "elk.spacing.nodeNode": "40",
      "elk.force.iterations": "200",
      "elk.force.repulsion": "200",
      "elk.force.gravitation": "50",
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
    console.error("[schema] Failed to run force-directed layout", error)
    return { nodes, edges }
  }
}

/**
 * Circular layout arranged in a circle
 */
export async function applyCircularLayout(
  nodes: Node<SchemaNodeData>[],
  edges: Edge[],
): Promise<{ nodes: Node<SchemaNodeData>[]; edges: Edge[] }> {
  if (nodes.length === 0) {
    return { nodes, edges }
  }

  console.log('[Layout] Applying circular layout')

  const centerX = 500
  const centerY = 400
  const radius = Math.max(200, Math.min(500, nodes.length * 25))

  const laidOutNodes = nodes.map((node, index) => {
    const angle = (2 * Math.PI * index) / nodes.length
    const x = centerX + radius * Math.cos(angle) - DEFAULT_NODE_WIDTH / 2
    const y = centerY + radius * Math.sin(angle) - (HEADER_HEIGHT + node.data.table.columns.length * ROW_HEIGHT) / 2

    return {
      ...node,
      position: { x, y }
    }
  })

  return { nodes: laidOutNodes, edges }
}

/**
 * Grid layout with IFC grouping
 */
export async function applyGridLayout(
  nodes: Node<SchemaNodeData>[],
  edges: Edge[],
): Promise<{ nodes: Node<SchemaNodeData>[]; edges: Edge[] }> {
  if (nodes.length === 0) {
    return { nodes, edges }
  }

  console.log('[Layout] Applying grid layout')

  const groups = sortNodesWithinCategories(createIfcGroups(nodes))
  const laidOutNodes: Node<SchemaNodeData>[] = []

  let currentY = 50

  groups.forEach(group => {
    const spacing = getCategorySpacing(group.category)
    const nodesPerRow = Math.ceil(Math.sqrt(group.nodes.length))
    let currentX = 50

    group.nodes.forEach((node, index) => {
      if (index > 0 && index % nodesPerRow === 0) {
        currentX = 50
        currentY += spacing.vertical
      }

      laidOutNodes.push({
        ...node,
        position: { x: currentX, y: currentY }
      })

      currentX += spacing.horizontal
    })

    currentY += spacing.vertical + 50 // Extra space between groups
  })

  return { nodes: laidOutNodes, edges }
}
