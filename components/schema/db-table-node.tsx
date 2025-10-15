"use client"

import { memo, type CSSProperties } from "react"
import { Handle, Position } from "reactflow"

import type { SchemaNodeData } from "@/lib/schema"

interface DbTableNodeProps {
  data: SchemaNodeData
}

const handleCommonStyles: CSSProperties = {
  width: 10,
  height: 10,
  borderRadius: "50%",
  background: "var(--primary)",
  border: "1px solid var(--background)",
}

function DbTableNodeComponent({ data }: DbTableNodeProps) {
  const { table, isSelected, connectedHandles = new Set() } = data

  return (
    <div
      className={`rounded-md border bg-background shadow-sm transition-shadow overflow-visible ${isSelected ? "ring-2 ring-primary" : "border-border"
        }`}
      style={{ width: '280px', height: 'auto' }}
    >
      <div className="flex items-center justify-between border-b bg-muted px-3 py-2">
        <span className="font-medium text-sm text-foreground">{table.name}</span>
        <span className="text-xs text-muted-foreground">{table.columns.length} cols</span>
      </div>
      <div className="px-3 py-2 text-xs text-muted-foreground max-h-none">
        {table.columns.map((column, index) => {
          const inHandleId = `in-${table.name}-${column.name}`
          const outHandleId = `out-${table.name}-${column.name}`
          const hasInConnection = connectedHandles.has(inHandleId)
          const hasOutConnection = connectedHandles.has(outHandleId)

          return (
            <div key={column.name} className="relative flex items-center py-1 text-foreground" style={{ minHeight: '28px' }}>
              {hasInConnection && (
                <Handle
                  type="target"
                  position={Position.Left}
                  id={inHandleId}
                  style={{
                    ...handleCommonStyles,
                    left: -5,
                    top: '50%',
                    transform: 'translateY(-50%)',
                  }}
                />
              )}
              <div className="flex flex-1 items-center gap-1">
                <span className="font-medium">{column.name}</span>
                <span className="text-muted-foreground">{column.type}</span>
                {column.pk ? <span className="rounded bg-primary/10 px-1 text-[10px] text-primary">PK</span> : null}
                {column.notNull && !column.pk ? (
                  <span className="rounded bg-secondary/20 px-1 text-[10px] text-secondary-foreground">NOT NULL</span>
                ) : null}
              </div>
              {hasOutConnection && (
                <Handle
                  type="source"
                  position={Position.Right}
                  id={outHandleId}
                  style={{
                    ...handleCommonStyles,
                    right: -5,
                    top: '50%',
                    transform: 'translateY(-50%)',
                  }}
                />
              )}
            </div>
          )
        })}
        {table.columns.length === 0 ? (
          <div className="py-2 text-muted-foreground">No columns detected</div>
        ) : null}
      </div>
    </div>
  )
}

export const DbTableNode = memo(DbTableNodeComponent)
