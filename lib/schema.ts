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
  console.log('[Schema] Starting schema extraction...')

  const tablesResult = await executeQuery(
    "SELECT name FROM sqlite_schema WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name;",
  )

  console.log('[Schema] Raw tables query result:', tablesResult)
  console.log('[Schema] Tables result length:', tablesResult.length)

  const tableNames = tablesResult
    .map((row) => {
      console.log('[Schema] Processing row:', row, 'row.name:', row.name, 'typeof row.name:', typeof row.name)
      return typeof row.name === "string" ? row.name : String(row.name)
    })
    .filter(Boolean)

  console.log('[Schema] Filtered table names:', tableNames)

  const tables: TableDef[] = []
  const foreignKeys: ForeignKeyDef[] = []

  for (const tableName of tableNames) {
    console.log('[Schema] Processing table:', tableName)

    const columnRows = await executeQuery(`PRAGMA table_info(${quoteIdentifier(tableName)});`)
    console.log('[Schema] Column rows for', tableName, ':', columnRows)

    const columns: ColumnDef[] = columnRows.map((row: any) => ({
      name: String(row.name ?? ""),
      type: row.type ? String(row.type) : "TEXT",
      notNull: Boolean(row.notnull),
      pk: Boolean(row.pk),
      defaultValue: row.dflt_value ?? null,
    }))

    console.log('[Schema] Processed columns for', tableName, ':', columns)

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

  // If no foreign keys found via PRAGMA, try to infer them
  if (foreignKeys.length === 0) {
    console.log('[Schema] No foreign keys found via PRAGMA, inferring relationships...')
    const inferredKeys = await inferForeignKeys(tables, executeQuery)
    console.log('[Schema] Inferred', inferredKeys.length, 'foreign key relationships')
    foreignKeys.push(...inferredKeys)
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
      } as Edge
    })
    .filter((edge): edge is Edge => edge !== null)

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

async function inferForeignKeys(tables: TableDef[], executeQuery: ExecuteQuery): Promise<ForeignKeyDef[]> {
  const foreignKeys: ForeignKeyDef[] = []

  console.log('[Schema] Starting foreign key inference for', tables.length, 'tables')

  // Utility tables to skip
  const skipTables = new Set(['id_map', 'metadata', 'psets', 'geometry', 'shape'])

  // Check if id_map table exists
  const hasIdMap = tables.some(t => t.name === 'id_map')
  console.log('[Schema] id_map table exists:', hasIdMap)

  // Create a map of table names for quick lookup
  const tableNames = new Set(tables.map(t => t.name))

  for (const table of tables) {
    if (skipTables.has(table.name)) {
      console.log('[Schema] Skipping utility table:', table.name)
      continue
    }

    // Find INTEGER columns that could be entity references
    const integerColumns = table.columns.filter(col =>
      col.type === 'INTEGER' &&
      col.name !== 'ifc_id' &&
      col.name !== 'inverses'
    )

    console.log('[Schema] Analyzing table', table.name, 'with', integerColumns.length, 'INTEGER columns')

    for (const column of integerColumns) {
      try {
        // Sample some non-null values from this column
        const sampleQuery = `
          SELECT DISTINCT ${quoteIdentifier(column.name)} 
          FROM ${quoteIdentifier(table.name)} 
          WHERE ${quoteIdentifier(column.name)} IS NOT NULL 
          LIMIT 10
        `

        const sampleRows = await executeQuery(sampleQuery)
        if (sampleRows.length === 0) continue

        const sampleValues = sampleRows
          .map(row => row[column.name])
          .filter(val => val != null && val !== '')
          .slice(0, 5) // Limit to 5 samples for performance

        if (sampleValues.length === 0) continue

        // Check which tables these IDs belong to
        let targetTables: string[] = []

        if (hasIdMap) {
          // Use id_map to find which tables these IDs belong to
          const idMapQuery = `
            SELECT DISTINCT ifc_class 
            FROM id_map 
            WHERE ifc_id IN (${sampleValues.join(',')})
          `
          const idMapRows = await executeQuery(idMapQuery)
          targetTables = idMapRows
            .map(row => row.ifc_class)
            .filter(cls => cls && tableNames.has(cls))
        } else {
          // Fallback: check if the column name suggests a relationship
          // Common patterns: ends with '_id', matches table names, etc.
          const columnName = column.name.toLowerCase()

          // Check if column name matches any table name
          for (const tableName of tableNames) {
            if (skipTables.has(tableName)) continue

            const lowerTableName = tableName.toLowerCase()
            if (columnName.includes(lowerTableName) ||
              columnName.endsWith('_id') && columnName.includes(lowerTableName.slice(0, -2))) {
              targetTables.push(tableName)
            }
          }
        }

        // Create foreign key relationships for each target table
        for (const targetTable of targetTables) {
          if (targetTable === table.name) continue // Skip self-references

          console.log('[Schema] Found relationship:', table.name + '.' + column.name, '->', targetTable + '.ifc_id')
          foreignKeys.push({
            fromTable: table.name,
            fromColumn: column.name,
            toTable: targetTable,
            toColumn: 'ifc_id', // IFC tables use ifc_id as primary key
          })
        }

      } catch (error) {
        // Skip columns that cause errors (e.g., non-existent columns)
        console.warn(`Failed to analyze column ${table.name}.${column.name}:`, error)
        continue
      }
    }
  }

  return foreignKeys
}
