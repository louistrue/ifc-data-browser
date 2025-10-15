"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  MarkerType,
  type Node,
  type NodeChange,
  type ReactFlowInstance,
  applyNodeChanges,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
} from "reactflow"
import "reactflow/dist/style.css"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { autoLayout, TABLE_NODE_HEADER_HEIGHT, TABLE_NODE_ROW_HEIGHT, TABLE_NODE_WIDTH } from "@/lib/auto-layout"
import {
  extractSchema,
  mapSchemaToFlow,
  type ExecuteQuery,
  type SchemaDef,
  type TableNodeData,
} from "@/lib/schema"
import { cn } from "@/lib/utils"
import { TableNode } from "./table-node"
import {
  LayoutDashboardIcon,
  LocateFixedIcon,
  RefreshCwIcon,
  Undo2Icon,
} from "lucide-react"

interface SchemaExplorerProps {
  executeQuery: ExecuteQuery
  schemaName: string
  fileName?: string
  onSelectTable?: (tableName: string) => void
  activeTable?: string | null
  isActive?: boolean
}

const nodeTypes = {
  tableNode: TableNode,
}

export function SchemaExplorer(props: SchemaExplorerProps) {
  return (
    <ReactFlowProvider>
      <SchemaExplorerInner {...props} />
    </ReactFlowProvider>
  )
}

function SchemaExplorerInner({
  executeQuery,
  schemaName,
  fileName,
  onSelectTable,
  activeTable,
  isActive,
}: SchemaExplorerProps) {
  const [nodes, setNodes] = useNodesState<TableNodeData>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [schema, setSchema] = useState<SchemaDef | null>(null)
  const [loadingSchema, setLoadingSchema] = useState(false)
  const [layoutPending, setLayoutPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null)
  const [hasRequested, setHasRequested] = useState(Boolean(isActive))

  const storageKey = useMemo(() => createStorageKey(schemaName, fileName), [schemaName, fileName])

  useEffect(() => {
    if (isActive) {
      setHasRequested(true)
    }
  }, [isActive])

  const persistLayout = useCallback(
    (nextNodes: Node<TableNodeData>[]) => {
      if (typeof window === "undefined") return
      const payload: Record<string, { x: number; y: number }> = {}
      nextNodes.forEach((node) => {
        payload[node.id] = { ...node.position }
      })
      window.localStorage.setItem(storageKey, JSON.stringify(payload))
    },
    [storageKey],
  )

  const clearSavedLayout = useCallback(() => {
    if (typeof window === "undefined") return
    window.localStorage.removeItem(storageKey)
  }, [storageKey])

  const loadSavedLayout = useCallback(() => {
    if (typeof window === "undefined") return null
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) return null
    try {
      const parsed = JSON.parse(raw) as Record<string, { x: number; y: number }>
      return parsed
    } catch {
      return null
    }
  }, [storageKey])

  const handleNodesChange = useCallback(
    (changes: NodeChange<TableNodeData>[]) => {
      setNodes((current) => {
        const updated = applyNodeChanges(changes, current)
        persistLayout(updated)
        return updated
      })
    },
    [persistLayout, setNodes],
  )

  const loadSchema = useCallback(async () => {
    setLoadingSchema(true)
    setError(null)
    try {
      const result = await extractSchema(executeQuery)
      const sortedTables = [...result.tables]
        .map((table) => ({
          ...table,
          columns: [...table.columns].sort((a, b) => {
            if (a.pk === b.pk) {
              return a.name.localeCompare(b.name)
            }
            return a.pk ? -1 : 1
          }),
        }))
        .sort((a, b) => a.name.localeCompare(b.name))

      const sortedForeignKeys = [...result.foreignKeys].sort((a, b) => {
        if (a.fromTable === b.fromTable) {
          return a.fromColumn.localeCompare(b.fromColumn)
        }
        return a.fromTable.localeCompare(b.fromTable)
      })

      setSchema({ tables: sortedTables, foreignKeys: sortedForeignKeys })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoadingSchema(false)
    }
  }, [executeQuery])

  useEffect(() => {
    if (hasRequested && !schema && !loadingSchema && !error) {
      loadSchema().catch((err) => setError(err instanceof Error ? err.message : String(err)))
    }
  }, [hasRequested, schema, loadingSchema, error])

  const runLayout = useCallback(
    async (skipSavedPositions = false) => {
      if (!schema) return
      setLayoutPending(true)
      try {
        const flow = mapSchemaToFlow(schema)
        setEdges(flow.edges)
        const layouted = await autoLayout(flow.nodes, flow.edges)
        const saved = skipSavedPositions ? null : loadSavedLayout()
        const positioned = applySavedPositions(layouted.nodes, saved)
        setNodes(positioned)
        persistLayout(positioned)
        setTimeout(() => {
          reactFlowInstance?.fitView({ padding: 0.18, duration: 450 })
        }, 80)
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        setLayoutPending(false)
      }
    },
    [schema, loadSavedLayout, setEdges, setNodes, persistLayout, reactFlowInstance],
  )

  useEffect(() => {
    if (schema) {
      runLayout(false).catch((err) => setError(err instanceof Error ? err.message : String(err)))
    }
  }, [schema, runLayout])

  const handleRefresh = useCallback(() => {
    loadSchema().catch((err) => setError(err instanceof Error ? err.message : String(err)))
  }, [loadSchema])

  const handleAutoLayout = useCallback(() => {
    runLayout(true).catch((err) => setError(err instanceof Error ? err.message : String(err)))
  }, [runLayout])

  const handleResetLayout = useCallback(() => {
    clearSavedLayout()
    runLayout(true).catch((err) => setError(err instanceof Error ? err.message : String(err)))
  }, [clearSavedLayout, runLayout])

  const handleFitView = useCallback(() => {
    reactFlowInstance?.fitView({ padding: 0.18, duration: 400 })
  }, [reactFlowInstance])

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node<TableNodeData>) => {
      onSelectTable?.(node.id)
    },
    [onSelectTable],
  )

  useEffect(() => {
    if (!activeTable) {
      setNodes((current) =>
        current.map((node) =>
          node.data?.isActive
            ? {
              ...node,
              data: { ...node.data, isActive: false },
            }
            : node,
        ),
      )
      return
    }

    setNodes((current) =>
      current.map((node) =>
        node.id === activeTable
          ? {
            ...node,
            data: { ...node.data, isActive: true },
          }
          : node.data?.isActive
            ? { ...node, data: { ...node.data, isActive: false } }
            : node,
      ),
    )

    if (reactFlowInstance && isActive) {
      const rfNode = reactFlowInstance.getNode(activeTable)
      if (rfNode) {
        const x = rfNode.positionAbsolute?.x ?? rfNode.position.x
        const y = rfNode.positionAbsolute?.y ?? rfNode.position.y
        const width = rfNode.measured?.width ?? rfNode.width ?? TABLE_NODE_WIDTH
        const height =
          rfNode.measured?.height ??
          rfNode.height ??
          TABLE_NODE_HEADER_HEIGHT + (rfNode.data?.table?.columns?.length ?? 0) * TABLE_NODE_ROW_HEIGHT

        setTimeout(() => {
          reactFlowInstance.setCenter(x + width / 2, y + height / 2, {
            zoom: 1.1,
            duration: 450,
          })
        }, 120)
      }
    }
  }, [activeTable, isActive, reactFlowInstance, setNodes])

  const isBusy = loadingSchema || layoutPending

  const showPlaceholder = !hasRequested && !schema && !loadingSchema && !error

  return (
    <Card className="!rounded-[4px]">
      <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <CardTitle className="text-lg font-semibold">Schema graph</CardTitle>
          <p className="text-sm text-muted-foreground">
            Visualize the SQLite schema extracted from your IFC model and explore table relationships.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="px-2 py-1 text-xs">
            {schema?.tables.length ?? 0} tables
          </Badge>
          <Badge variant="outline" className="px-2 py-1 text-xs">
            {schema?.foreignKeys.length ?? 0} relations
          </Badge>
          {fileName && (
            <Badge variant="outline" className="px-2 py-1 text-xs">
              {fileName}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loadingSchema}>
            <RefreshCwIcon className="mr-2 h-4 w-4" /> Refresh schema
          </Button>
          <Button variant="outline" size="sm" onClick={handleAutoLayout} disabled={isBusy || !schema}>
            <LayoutDashboardIcon className="mr-2 h-4 w-4" /> Auto layout
          </Button>
          <Button variant="outline" size="sm" onClick={handleResetLayout} disabled={isBusy || !schema}>
            <Undo2Icon className="mr-2 h-4 w-4" /> Reset layout
          </Button>
          <Button variant="outline" size="sm" onClick={handleFitView} disabled={!schema}>
            <LocateFixedIcon className="mr-2 h-4 w-4" /> Fit view
          </Button>
          {isBusy && <span className="text-sm text-muted-foreground">Updating…</span>}
        </div>

        {loadingSchema && !schema && (
          <div className="flex h-[520px] w-full items-center justify-center rounded-md border border-dashed">
            <p className="text-sm text-muted-foreground">Loading schema from SQLite…</p>
          </div>
        )}

        {error && (
          <div className="flex h-[520px] w-full flex-col items-center justify-center gap-4 rounded-md border border-destructive/50 bg-destructive/5 p-6 text-center">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="destructive" size="sm" onClick={handleRefresh}>
              Retry loading schema
            </Button>
          </div>
        )}

        {showPlaceholder && (
          <div className="flex h-[520px] w-full items-center justify-center rounded-md border border-dashed">
            <p className="text-sm text-muted-foreground">Select the Schema tab to load the database graph.</p>
          </div>
        )}

        {schema && !error && (
          <div className={cn("h-[520px] w-full", isBusy && "pointer-events-none opacity-90")}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onNodesChange={handleNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeClick={handleNodeClick}
              onInit={setReactFlowInstance}
              fitView={false}
              proOptions={{ hideAttribution: true }}
              minZoom={0.3}
              maxZoom={1.8}
              nodesDraggable
              nodesConnectable={false}
              elementsSelectable
              panOnScroll
              panOnDrag
              selectionOnDrag
              defaultEdgeOptions={{
                type: "smoothstep",
                markerEnd: {
                  type: MarkerType.ArrowClosed,
                  width: 16,
                  height: 16,
                },
                style: { strokeWidth: 1.4 },
              }}
            >
              <Background gap={24} size={2} color="#CBD5F5" />
              <MiniMap
                nodeColor={(node) => (node?.data?.isActive ? "#2563EB" : "#A5B4FC")}
                nodeStrokeColor={() => "#312E81"}
                pannable
                zoomable
              />
              <Controls position="top-right" />
            </ReactFlow>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function applySavedPositions(
  nodes: ReturnType<typeof mapSchemaToFlow>["nodes"],
  saved: Record<string, { x: number; y: number }> | null,
) {
  if (!saved) return nodes
  return nodes.map((node) => {
    const savedPosition = saved[node.id]
    if (savedPosition) {
      return {
        ...node,
        position: savedPosition,
      }
    }
    return node
  })
}

function createStorageKey(schemaName: string, fileName?: string) {
  const safeSchema = schemaName ? schemaName.toLowerCase().replace(/[^a-z0-9]+/g, "-") : "schema"
  const safeFile = fileName ? fileName.toLowerCase().replace(/[^a-z0-9]+/g, "-") : "model"
  return `ifc-schema-layout::${safeSchema}::${safeFile}`
}
