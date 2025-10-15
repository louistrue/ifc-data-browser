"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react"
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  type Edge,
  type Node,
  type NodeChange,
  applyNodeChanges,
  useReactFlow,
} from "reactflow"

import "reactflow/dist/style.css"

import { Button } from "@/components/ui/button"
import type { SchemaDef, SchemaNodeData } from "@/lib/schema"
import { applyLayout, type LayoutAlgorithm } from "@/lib/schema-layout"
import { mapSchemaToFlow } from "@/lib/schema-flow"
import { enhanceSchemaWithRelationships } from "@/lib/schema-inference"
import { filterEdgesByRelationships, DEFAULT_RELATIONSHIP_FILTER, type RelationshipFilter } from "@/lib/schema-filter"
import { SchemaToolbar } from "./schema-toolbar"

import { DbTableNode } from "./db-table-node"

// Create stable references to prevent React Flow warnings
const stableNodeTypes = { schemaTable: DbTableNode }
const stableEdgeTypes = {}

interface SchemaTabProps {
  usePyodide: any
  fileKey?: string | null
  selectedTable?: string | null
  onSelectTable?: (table: string) => void
}

interface StoredLayoutEntry {
  id: string
  position: { x: number; y: number }
}

const STORAGE_PREFIX = "ifc-schema-layout"

function getStorageKey(fileKey?: string | null) {
  return `${STORAGE_PREFIX}:${fileKey || "default"}`
}

function readStoredLayout(fileKey?: string | null) {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(getStorageKey(fileKey))
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredLayoutEntry[]
    return new Map(parsed.map((entry) => [entry.id, entry.position]))
  } catch (error) {
    console.warn("[schema] Failed to read stored layout", error)
    return null
  }
}

function storeLayout(nodes: Node<SchemaNodeData>[], fileKey?: string | null) {
  if (typeof window === "undefined") return
  try {
    const payload: StoredLayoutEntry[] = nodes.map((node) => ({
      id: node.id,
      position: node.position,
    }))
    window.localStorage.setItem(getStorageKey(fileKey), JSON.stringify(payload))
  } catch (error) {
    console.warn("[schema] Failed to persist layout", error)
  }
}

function SchemaFlow({
  usePyodide,
  fileKey,
  selectedTable,
  onSelectTable,
}: SchemaTabProps) {
  const [schema, setSchema] = useState<SchemaDef | null>(null)
  const [nodes, setNodes] = useState<Node<SchemaNodeData>[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  const [filteredEdges, setFilteredEdges] = useState<Edge[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const [layoutAlgorithm, setLayoutAlgorithm] = useState<LayoutAlgorithm>('grid')
  const [relationshipFilters, setRelationshipFilters] = useState<RelationshipFilter>(DEFAULT_RELATIONSHIP_FILTER)
  const reactFlow = useReactFlow<SchemaNodeData>()
  const hasFitView = useRef(false)

  // Use stable references to prevent React Flow warnings
  const nodeTypes = stableNodeTypes
  const edgeTypes = stableEdgeTypes

  useEffect(() => {
    let isMounted = true

    const fetchSchema = async () => {
      if (!usePyodide?.isInitialized || !usePyodide.getSchema) {
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const schemaResult: SchemaDef = await usePyodide.getSchema()
        if (!isMounted) return

        setSchema(schemaResult)

        // Enhance schema with inferred relationships
        const enhancedSchema = enhanceSchemaWithRelationships(schemaResult)
        console.log('[Schema] Enhanced schema:', {
          originalFKCount: schemaResult.foreignKeys.length,
          enhancedFKCount: enhancedSchema.foreignKeys.length,
          inferredCount: enhancedSchema.foreignKeys.length - schemaResult.foreignKeys.length
        })

        const { nodes: mappedNodes, edges: mappedEdges } = mapSchemaToFlow(enhancedSchema)

        console.log('[Schema] Mapping schema to flow:', {
          nodeCount: mappedNodes.length,
          edgeCount: mappedEdges.length,
          edges: mappedEdges.map(e => ({ id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle, targetHandle: e.targetHandle }))
        })

        const storedPositions = readStoredLayout(fileKey)
        const hasCompleteLayout = storedPositions && storedPositions.size === mappedNodes.length

        let nodesWithPositions = mappedNodes.map((node) => {
          const stored = storedPositions?.get(node.id)
          return stored
            ? {
              ...node,
              position: stored,
            }
            : node
        })

        if (!hasCompleteLayout) {
          const laidOut = await applyLayout(nodesWithPositions, mappedEdges, layoutAlgorithm)
          nodesWithPositions = laidOut.nodes
          storeLayout(nodesWithPositions, fileKey)
        }

        setNodes(nodesWithPositions)
        setEdges(mappedEdges)

        // Apply initial filtering
        const initialFilteredEdges = filterEdgesByRelationships(mappedEdges, relationshipFilters)
        setFilteredEdges(initialFilteredEdges)

        console.log('[Schema] Setting nodes and edges:', {
          finalNodeCount: nodesWithPositions.length,
          finalEdgeCount: mappedEdges.length,
          nodeIds: nodesWithPositions.map(n => n.id),
          edgeIds: mappedEdges.map(e => e.id)
        })

        hasFitView.current = false
      } catch (err: any) {
        if (!isMounted) return
        setError(err?.message || "Failed to load schema definition")
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    fetchSchema()

    return () => {
      isMounted = false
    }
  }, [fileKey, reloadToken, usePyodide])

  useEffect(() => {
    if (!selectedTable) return
    const node = reactFlow.getNode(selectedTable)
    if (node) {
      reactFlow.setCenter(node.position.x + (node.width ?? 0) / 2, node.position.y + (node.height ?? 0) / 2, {
        zoom: 0.8,
        duration: 400,
      })
    }
  }, [reactFlow, selectedTable])

  useEffect(() => {
    setNodes((current) =>
      current.map((node) => ({
        ...node,
        data: {
          ...node.data,
          isSelected: selectedTable === node.id,
        },
      })),
    )
  }, [selectedTable])

  // Update nodes with connected handles information
  useEffect(() => {
    const connectedHandlesMap = new Map<string, Set<string>>()

    filteredEdges.forEach(edge => {
      if (edge.sourceHandle) {
        if (!connectedHandlesMap.has(edge.source)) {
          connectedHandlesMap.set(edge.source, new Set())
        }
        connectedHandlesMap.get(edge.source)!.add(edge.sourceHandle)
      }
      if (edge.targetHandle) {
        if (!connectedHandlesMap.has(edge.target)) {
          connectedHandlesMap.set(edge.target, new Set())
        }
        connectedHandlesMap.get(edge.target)!.add(edge.targetHandle)
      }
    })

    setNodes((current) =>
      current.map((node) => ({
        ...node,
        data: {
          ...node.data,
          connectedHandles: connectedHandlesMap.get(node.id) || new Set(),
        },
      })),
    )
  }, [filteredEdges])

  useEffect(() => {
    if (nodes.length > 0 && !hasFitView.current) {
      hasFitView.current = true
      reactFlow.fitView({ padding: 0.2 })
    }
  }, [nodes, reactFlow])

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((nds) => {
        const updated = applyNodeChanges(changes, nds)
        if (changes.some((change) => change.type === "position" && change.dragging === false)) {
          storeLayout(updated, fileKey)
        }
        return updated
      })
    },
    [fileKey],
  )

  const handleNodeClick = useCallback(
    (_: MouseEvent, node: Node<SchemaNodeData>) => {
      if (onSelectTable) {
        onSelectTable(node.id)
      }
    },
    [onSelectTable],
  )

  const handleLayoutChange = useCallback(async (newLayout: LayoutAlgorithm) => {
    setLayoutAlgorithm(newLayout)

    // Preserve connected handles when changing layout
    const connectedHandlesMap = new Map<string, Set<string>>()
    filteredEdges.forEach(edge => {
      if (edge.sourceHandle) {
        if (!connectedHandlesMap.has(edge.source)) {
          connectedHandlesMap.set(edge.source, new Set())
        }
        connectedHandlesMap.get(edge.source)!.add(edge.sourceHandle)
      }
      if (edge.targetHandle) {
        if (!connectedHandlesMap.has(edge.target)) {
          connectedHandlesMap.set(edge.target, new Set())
        }
        connectedHandlesMap.get(edge.target)!.add(edge.targetHandle)
      }
    })

    const nodesWithHandles = nodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        connectedHandles: connectedHandlesMap.get(node.id) || new Set()
      }
    }))

    const { nodes: laidOut } = await applyLayout(nodesWithHandles, edges, newLayout)
    storeLayout(laidOut, fileKey)
    setNodes(laidOut)
    hasFitView.current = false
  }, [edges, fileKey, nodes, filteredEdges])

  const handleFilterChange = useCallback((newFilters: RelationshipFilter) => {
    setRelationshipFilters(newFilters)
    const filtered = filterEdgesByRelationships(edges, newFilters)
    setFilteredEdges(filtered)
  }, [edges])

  const handleResetLayout = useCallback(async () => {
    if (!schema) return

    // Calculate connected handles
    const connectedHandlesMap = new Map<string, Set<string>>()
    filteredEdges.forEach(edge => {
      if (edge.sourceHandle) {
        if (!connectedHandlesMap.has(edge.source)) {
          connectedHandlesMap.set(edge.source, new Set())
        }
        connectedHandlesMap.get(edge.source)!.add(edge.sourceHandle)
      }
      if (edge.targetHandle) {
        if (!connectedHandlesMap.has(edge.target)) {
          connectedHandlesMap.set(edge.target, new Set())
        }
        connectedHandlesMap.get(edge.target)!.add(edge.targetHandle)
      }
    })

    const { nodes: mappedNodes } = mapSchemaToFlow(schema)

    // Add connected handles to nodes
    const nodesWithHandles = mappedNodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        connectedHandles: connectedHandlesMap.get(node.id) || new Set()
      }
    }))

    const { nodes: laidOut } = await applyLayout(nodesWithHandles, edges, layoutAlgorithm)
    storeLayout(laidOut, fileKey)
    setNodes(laidOut)
    hasFitView.current = false
  }, [edges, fileKey, schema, layoutAlgorithm, filteredEdges])

  const handleFitView = useCallback(() => {
    reactFlow.fitView({ padding: 0.2 })
  }, [reactFlow])

  if (isLoading) {
    return (
      <div className="flex h-[600px] w-full items-center justify-center rounded-md border bg-muted/20">
        <span className="text-sm text-muted-foreground">Loading database schema…</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-[600px] w-full flex-col items-center justify-center gap-3 rounded-md border bg-destructive/10 p-6 text-center">
        <p className="text-sm text-destructive">{error}</p>
        <Button
          variant="outline"
          onClick={() => {
            setError(null)
            setReloadToken((token) => token + 1)
          }}
        >
          Try again
        </Button>
      </div>
    )
  }

  if (!schema || nodes.length === 0) {
    return (
      <div className="flex h-[600px] w-full items-center justify-center rounded-md border bg-muted/20">
        <span className="text-sm text-muted-foreground">Schema will appear after processing an IFC file.</span>
      </div>
    )
  }

  return (
    <div className="h-[600px] w-full">
      <div className="mb-3">
        <SchemaToolbar
          currentLayout={layoutAlgorithm}
          currentFilters={relationshipFilters}
          onLayoutChange={handleLayoutChange}
          onFilterChange={handleFilterChange}
          onResetLayout={handleResetLayout}
          onFitView={handleFitView}
          edgeCount={edges.length}
          filteredEdgeCount={filteredEdges.length}
        />
      </div>
      <div className="h-[520px] w-full overflow-visible rounded-md border">
        <ReactFlow<SchemaNodeData>
          nodes={nodes}
          edges={filteredEdges}
          onNodesChange={handleNodesChange}
          onNodeClick={handleNodeClick}
          fitView
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          nodesDraggable
          panOnDrag
          zoomOnScroll
          defaultEdgeOptions={{
            style: { strokeWidth: 2, stroke: '#3b82f6' },
            animated: true
          }}
        >
          <Background gap={16} />
          <MiniMap pannable zoomable />
          <Controls position="bottom-right" />
        </ReactFlow>
      </div>
    </div>
  )
}

export function SchemaTab(props: SchemaTabProps) {
  return (
    <ReactFlowProvider>
      <SchemaFlow {...props} />
    </ReactFlowProvider>
  )
}
