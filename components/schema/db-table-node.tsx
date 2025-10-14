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
  const { table, isSelected } = data

  return (
    <div
      className={`rounded-md border bg-background shadow-sm transition-shadow ${
        isSelected ? "ring-2 ring-primary" : "border-border"
      }`}
    >
      <div className="flex items-center justify-between border-b bg-muted px-3 py-2">
        <span className="font-medium text-sm text-foreground">{table.name}</span>
        <span className="text-xs text-muted-foreground">{table.columns.length} cols</span>
      </div>
      <div className="px-3 py-2 text-xs text-muted-foreground">
        {table.columns.map((column, index) => {
          const topOffset = 24 + index * 22
          return (
            <div key={column.name} className="relative flex items-center py-1 text-foreground">
              <Handle
                type="target"
                position={Position.Left}
                id={`in-${table.name}-${column.name}`}
                style={{
                  ...handleCommonStyles,
                  left: -5,
                  top: topOffset,
                }}
              />
              <div className="flex flex-1 items-center gap-1">
                <span className="font-medium">{column.name}</span>
                <span className="text-muted-foreground">{column.type}</span>
                {column.pk ? <span className="rounded bg-primary/10 px-1 text-[10px] text-primary">PK</span> : null}
                {column.notNull && !column.pk ? (
                  <span className="rounded bg-secondary/20 px-1 text-[10px] text-secondary-foreground">NOT NULL</span>
                ) : null}
              </div>
              <Handle
                type="source"
                position={Position.Right}
                id={`out-${table.name}-${column.name}`}
                style={{
                  ...handleCommonStyles,
                  right: -5,
                  top: topOffset,
                }}
              />
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
