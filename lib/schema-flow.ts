import type { Edge, Node } from "reactflow"

import type { ForeignKeyDef, SchemaDef, SchemaNodeData } from "@/lib/schema"

function createEdgeId(fk: ForeignKeyDef, index: number) {
  return `fk-${fk.fromTable}-${fk.fromColumn}-${fk.toTable}-${fk.toColumn}-${index}`
}

export function mapSchemaToFlow(schema: SchemaDef): {
  nodes: Node<SchemaNodeData>[]
  edges: Edge[]
} {
  console.log('[Schema Flow] Input schema:', {
    tableCount: schema.tables.length,
    foreignKeyCount: schema.foreignKeys.length,
    tables: schema.tables.map(t => t.name),
    foreignKeys: schema.foreignKeys.map(fk => ({ from: fk.fromTable, to: fk.toTable, fromCol: fk.fromColumn, toCol: fk.toColumn }))
  })
  const nodes: Node<SchemaNodeData>[] = schema.tables.map((table) => ({
    id: table.name,
    type: "schemaTable",
    data: {
      table,
      isSelected: false,
    },
    position: { x: 0, y: 0 },
  }))

  const edges: Edge[] = schema.foreignKeys.map((fk, index) => {
    const edge = {
      id: createEdgeId(fk, index),
      source: fk.fromTable,
      target: fk.toTable,
      sourceHandle: `out-${fk.fromTable}-${fk.fromColumn}`,
      targetHandle: `in-${fk.toTable}-${fk.toColumn}`,
      label: `${fk.fromColumn} → ${fk.toColumn}`,
      animated: true,
      style: {
        strokeWidth: 2,
        stroke: '#3b82f6',
        strokeDasharray: '5,5'
      },
    }

    console.log('[Schema Flow] Creating edge:', {
      fk,
      edge,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle
    })

    return edge
  })

  return { nodes, edges }
}
