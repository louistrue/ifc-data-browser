"use client"

import type { NodeProps } from "reactflow"
import { Handle, Position } from "reactflow"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { TABLE_NODE_HEADER_HEIGHT, TABLE_NODE_ROW_HEIGHT, TABLE_NODE_WIDTH } from "@/lib/auto-layout"
import { createHandleId, type TableNodeData } from "@/lib/schema"

export function TableNode({ data }: NodeProps<TableNodeData>) {
  const { table, isActive } = data
  const columns = table.columns || []
  const primaryKeyCount = columns.filter((column) => column.pk).length

  return (
    <div
      className={cn(
        "relative rounded-lg border bg-background text-xs shadow-sm transition-all",
        isActive
          ? "border-blue-500 ring-2 ring-blue-200/80"
          : "border-border hover:border-primary/40 hover:shadow-md",
      )}
      style={{ width: TABLE_NODE_WIDTH }}
    >
      <div
        className={cn(
          "flex items-center justify-between border-b px-3 py-2",
          isActive ? "bg-blue-50/80" : "bg-muted/40",
        )}
      >
        <span className="font-semibold text-foreground text-sm truncate" title={table.name}>
          {table.name}
        </span>
        {primaryKeyCount > 0 && (
          <Badge
            variant="outline"
            className="h-5 px-2 text-[10px] font-semibold uppercase tracking-wide text-blue-700"
          >
            PK {primaryKeyCount}
          </Badge>
        )}
      </div>
      <div className="relative divide-y">
        {columns.length === 0 && (
          <div className="px-3 py-3 text-muted-foreground">No columns detected</div>
        )}
        {columns.map((column, index) => {
          const top = TABLE_NODE_HEADER_HEIGHT + (index + 0.5) * TABLE_NODE_ROW_HEIGHT
          return (
            <div
              key={column.name}
              className="flex items-center gap-2 px-3 py-1.5 text-[11px] text-muted-foreground"
            >
              <Handle
                type="target"
                position={Position.Left}
                id={createHandleId(table.name, column.name, "in")}
                isConnectable={false}
                style={{ top, transform: "translateY(-50%)" }}
              />
              <div className="flex flex-1 flex-col overflow-hidden">
                <span className="truncate font-medium text-foreground">{column.name}</span>
                <span className="truncate uppercase tracking-wide">{column.type || "TEXT"}</span>
              </div>
              {column.pk && (
                <Badge variant="secondary" className="h-5 px-2 text-[10px] uppercase">
                  PK
                </Badge>
              )}
              <Handle
                type="source"
                position={Position.Right}
                id={createHandleId(table.name, column.name, "out")}
                isConnectable={false}
                style={{ top, transform: "translateY(-50%)" }}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
