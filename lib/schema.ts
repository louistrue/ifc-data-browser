export interface ColumnDef {
  name: string
  type: string
  notNull: boolean
  pk: boolean
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

export interface SchemaNodeData {
  table: TableDef
  isSelected?: boolean
}
