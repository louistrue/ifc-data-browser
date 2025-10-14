import type { Edge, Node } from "reactflow"
import { MarkerType } from "reactflow"

export interface ColumnDef {
  name: string
  type: string
  notNull: boolean
  pk: boolean
  defaultValue?: string | null
}

export interface TableDef {
  name: string
  columns: ColumnDef[]
}

export interface ForeignKeyDef {
  fromTable: string
  fromColumn: string
  toTable: string
  toColumn: string
}

export interface SchemaDef {
  tables: TableDef[]
  foreignKeys: ForeignKeyDef[]
}

export interface TableNodeData {
  table: TableDef
  isActive?: boolean
}

export type ExecuteQuery = (sql: string) => Promise<any[]>

export async function extractSchema(executeQuery: ExecuteQuery): Promise<SchemaDef> {
  const tablesResult = await executeQuery(
    "SELECT name FROM sqlite_schema WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name;",
  )

  const tableNames = tablesResult
    .map((row) => (typeof row.name === "string" ? row.name : String(row.name)))
    .filter(Boolean)

  const tables: TableDef[] = []
  const foreignKeys: ForeignKeyDef[] = []

  for (const tableName of tableNames) {
    const columnRows = await executeQuery(`PRAGMA table_info(${quoteIdentifier(tableName)});`)

    const columns: ColumnDef[] = columnRows.map((row: any) => ({
      name: String(row.name ?? ""),
      type: row.type ? String(row.type) : "TEXT",
      notNull: Boolean(row.notnull),
      pk: Boolean(row.pk),
      defaultValue: row.dflt_value ?? null,
    }))

    const foreignKeyRows = await executeQuery(`PRAGMA foreign_key_list(${quoteIdentifier(tableName)});`)
    foreignKeyRows.forEach((row: any) => {
      if (!row || !row.table || !row.from || !row.to) return
      foreignKeys.push({
        fromTable: tableName,
        fromColumn: String(row.from),
        toTable: String(row.table),
        toColumn: String(row.to),
      })
    })

    tables.push({
      name: tableName,
      columns,
    })
  }

  return {
    tables,
    foreignKeys,
  }
}

export function mapSchemaToFlow(schema: SchemaDef): {
  nodes: Node<TableNodeData>[]
  edges: Edge[]
} {
  const nodes: Node<TableNodeData>[] = schema.tables.map((table, index) => ({
    id: table.name,
    type: "tableNode",
    data: { table },
    position: { x: index * 260, y: 0 },
  }))

  const seen = new Set<string>()
  const edges: Edge[] = schema.foreignKeys
    .map((fk, index) => {
      const key = `${fk.fromTable}::${fk.fromColumn}->${fk.toTable}::${fk.toColumn}`
      if (seen.has(key)) {
        return null
      }
      seen.add(key)

      return {
        id: `fk-${index}-${fk.fromTable}-${fk.fromColumn}-${fk.toTable}-${fk.toColumn}`,
        source: fk.fromTable,
        target: fk.toTable,
        sourceHandle: createHandleId(fk.fromTable, fk.fromColumn, "out"),
        targetHandle: createHandleId(fk.toTable, fk.toColumn, "in"),
        type: "smoothstep",
        label: `${fk.fromColumn} → ${fk.toColumn}`,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 16,
          height: 16,
        },
        labelBgPadding: [4, 2],
        labelBgBorderRadius: 4,
        animated: false,
      } satisfies Edge
    })
    .filter((edge): edge is Edge => Boolean(edge))

  return { nodes, edges }
}

export function createHandleId(tableName: string, columnName: string, direction: "in" | "out") {
  return `${direction}-${sanitizeIdentifier(tableName)}-${sanitizeIdentifier(columnName)}`
}

function quoteIdentifier(name: string) {
  return `"${name.replace(/"/g, '""')}"`
}

function sanitizeIdentifier(value: string) {
  return value.replace(/[^a-zA-Z0-9_]/g, "_")
}
