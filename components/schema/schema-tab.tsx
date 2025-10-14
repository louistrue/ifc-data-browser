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
import { applyAutoLayout } from "@/lib/schema-layout"
import { mapSchemaToFlow } from "@/lib/schema-flow"

import { DbTableNode } from "./db-table-node"

interface SchemaTabProps {
  getSchema?: () => Promise<SchemaDef>
  isPyodideReady?: boolean
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
  getSchema,
  isPyodideReady,
  fileKey,
  selectedTable,
  onSelectTable,
}: SchemaTabProps) {
  const [schema, setSchema] = useState<SchemaDef | null>(null)
  const [nodes, setNodes] = useState<Node<SchemaNodeData>[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const reactFlow = useReactFlow<SchemaNodeData>()
  const hasFitView = useRef(false)

  const nodeTypes = useMemo(() => ({ schemaTable: DbTableNode }), [])

  useEffect(() => {
    if (!isPyodideReady) {
      setSchema(null)
      setNodes([])
      setEdges([])
    }
  }, [isPyodideReady])

  useEffect(() => {
    let isMounted = true

    const fetchSchema = async () => {
      if (!isPyodideReady || !getSchema) {
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const schemaResult: SchemaDef = await getSchema()
        if (!isMounted) return

        setSchema(schemaResult)
        const { nodes: mappedNodes, edges: mappedEdges } = mapSchemaToFlow(schemaResult)
        const storedPositions = readStoredLayout(fileKey)
        let nodesWithPositions = mappedNodes.map((node) => {
          const stored = storedPositions?.get(node.id)
          return stored
            ? {
                ...node,
                position: stored,
              }
            : node
        })

        const needsLayout = nodesWithPositions.some((node) => !storedPositions?.has(node.id))

        if (needsLayout) {
          const laidOut = await applyAutoLayout(nodesWithPositions, mappedEdges)
          nodesWithPositions = laidOut.nodes
          storeLayout(nodesWithPositions, fileKey)
        }

        setNodes(nodesWithPositions)
        setEdges(mappedEdges)
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
  }, [fileKey, getSchema, isPyodideReady, reloadToken])

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

  const handleAutoLayout = useCallback(async () => {
    const { nodes: laidOut } = await applyAutoLayout(nodes, edges)
    storeLayout(laidOut, fileKey)
    setNodes(laidOut)
    hasFitView.current = false
  }, [edges, fileKey, nodes])

  const handleResetLayout = useCallback(async () => {
    if (!schema) return
    const { nodes: mappedNodes } = mapSchemaToFlow(schema)
    const { nodes: laidOut } = await applyAutoLayout(mappedNodes, edges)
    storeLayout(laidOut, fileKey)
    setNodes(laidOut)
    hasFitView.current = false
  }, [edges, fileKey, schema])

  if (!isPyodideReady) {
    return (
      <div className="flex h-[600px] w-full items-center justify-center rounded-md border bg-muted/20">
        <span className="text-sm text-muted-foreground">Schema is available after the database has been initialized.</span>
      </div>
    )
  }

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
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-foreground">Entity Relationship Graph</h3>
          <p className="text-xs text-muted-foreground">Drag tables to refine layout. Your changes are saved automatically.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleAutoLayout}>
            Auto-layout
          </Button>
          <Button variant="secondary" size="sm" onClick={handleResetLayout}>
            Reset layout
          </Button>
        </div>
      </div>
      <div className="h-[520px] w-full overflow-hidden rounded-md border">
        <ReactFlow<SchemaNodeData>
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onNodeClick={handleNodeClick}
          fitView
          nodeTypes={nodeTypes}
          nodesDraggable
          panOnDrag
          zoomOnScroll
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
