import type { SchemaDef, ForeignKeyDef } from "@/lib/schema"

/**
 * Infer IFC relationships based on naming conventions and column patterns
 * since the SQLite database doesn't have explicit foreign key constraints
 */
export function inferIfcRelationships(schema: SchemaDef): ForeignKeyDef[] {
    const relationships: ForeignKeyDef[] = []

    console.log('[Schema Inference] Starting relationship inference for', schema.tables.length, 'tables')

    // Common IFC relationship patterns
    const relationshipPatterns = [
        // OwnerHistory relationships - most entities have OwnerHistory
        {
            pattern: /^Ifc[A-Z]/,
            fromColumn: 'OwnerHistory',
            toTable: 'IfcOwnerHistory',
            toColumn: 'ifc_id'
        },
        // GlobalId relationships - entities reference other entities by GlobalId
        {
            pattern: /^Ifc[A-Z]/,
            fromColumn: 'GlobalId',
            toTable: 'IfcRoot',
            toColumn: 'GlobalId'
        },
        // Spatial containment relationships
        {
            pattern: /^Ifc[A-Z]/,
            fromColumn: 'ContainedInStructure',
            toTable: 'IfcRelContainedInSpatialStructure',
            toColumn: 'ifc_id'
        },
        // Property relationships
        {
            pattern: /^Ifc[A-Z]/,
            fromColumn: 'DefinedByProperties',
            toTable: 'IfcRelDefinesByProperties',
            toColumn: 'ifc_id'
        },
        // Type relationships
        {
            pattern: /^Ifc[A-Z]/,
            fromColumn: 'IsTypedBy',
            toTable: 'IfcRelDefinesByType',
            toColumn: 'ifc_id'
        },
        // Material relationships
        {
            pattern: /^Ifc[A-Z]/,
            fromColumn: 'HasAssociations',
            toTable: 'IfcRelAssociatesMaterial',
            toColumn: 'ifc_id'
        },
        // Classification relationships
        {
            pattern: /^Ifc[A-Z]/,
            fromColumn: 'HasAssociations',
            toTable: 'IfcRelAssociatesClassification',
            toColumn: 'ifc_id'
        }
    ]

    // Create a map of table names for quick lookup
    const tableNames = new Set(schema.tables.map(t => t.name))

    for (const table of schema.tables) {
        for (const column of table.columns) {
            // Skip primary key columns
            if (column.pk) continue

            // Look for relationship columns based on naming patterns
            const columnName = column.name

            // Check for direct entity references (columns ending with _id or referencing other entities)
            if (columnName.endsWith('_id') || columnName.endsWith('Id')) {
                // Try to find a corresponding table
                const possibleTableName = columnName.replace(/_id$|Id$/, '')
                const possibleIfcTableName = `Ifc${possibleTableName}`

                if (tableNames.has(possibleIfcTableName)) {
                    relationships.push({
                        fromTable: table.name,
                        fromColumn: columnName,
                        toTable: possibleIfcTableName,
                        toColumn: 'ifc_id'
                    })
                    console.log('[Schema Inference] Found relationship:', table.name, '->', possibleIfcTableName, 'via', columnName)
                }
            }

            // Check for common IFC relationship columns
            const commonRelationships = [
                'OwnerHistory', 'GlobalId', 'ContainedInStructure', 'DefinedByProperties',
                'IsTypedBy', 'HasAssociations', 'RelatingObject', 'RelatedObjects'
            ]

            if (commonRelationships.includes(columnName)) {
                // Try to find corresponding relationship tables
                const relationshipTableName = `IfcRel${columnName.replace(/([A-Z])/g, '$1')}`

                if (tableNames.has(relationshipTableName)) {
                    relationships.push({
                        fromTable: table.name,
                        fromColumn: columnName,
                        toTable: relationshipTableName,
                        toColumn: 'ifc_id'
                    })
                    console.log('[Schema Inference] Found common relationship:', table.name, '->', relationshipTableName, 'via', columnName)
                }
            }

            // Check for columns that reference other entities by name pattern
            if (columnName.includes('Relating') || columnName.includes('Related')) {
                const targetEntity = columnName.replace(/Relating|Related/, '')
                const possibleTableName = `Ifc${targetEntity}`

                if (tableNames.has(possibleTableName)) {
                    relationships.push({
                        fromTable: table.name,
                        fromColumn: columnName,
                        toTable: possibleTableName,
                        toColumn: 'ifc_id'
                    })
                    console.log('[Schema Inference] Found relating relationship:', table.name, '->', possibleTableName, 'via', columnName)
                }
            }

            // Check for common IFC entity reference patterns
            const entityReferencePatterns = [
                'OwnerHistory', 'GlobalId', 'ObjectPlacement', 'Representation',
                'PredefinedType', 'ObjectType', 'Material', 'Classification',
                'ContainedInStructure', 'DefinedByProperties', 'IsTypedBy',
                'HasAssociations', 'RelatingObject', 'RelatedObjects'
            ]

            if (entityReferencePatterns.includes(columnName)) {
                // Try to find a corresponding entity table
                const possibleTableName = `Ifc${columnName}`

                if (tableNames.has(possibleTableName)) {
                    relationships.push({
                        fromTable: table.name,
                        fromColumn: columnName,
                        toTable: possibleTableName,
                        toColumn: 'ifc_id'
                    })
                    console.log('[Schema Inference] Found entity reference:', table.name, '->', possibleTableName, 'via', columnName)
                }
            }

            // Check for spatial relationships
            if (columnName.includes('Spatial') || columnName.includes('Structure') || columnName.includes('Space')) {
                const spatialTables = ['IfcSpace', 'IfcBuilding', 'IfcBuildingStorey', 'IfcSite']
                for (const spatialTable of spatialTables) {
                    if (tableNames.has(spatialTable)) {
                        relationships.push({
                            fromTable: table.name,
                            fromColumn: columnName,
                            toTable: spatialTable,
                            toColumn: 'ifc_id'
                        })
                        console.log('[Schema Inference] Found spatial relationship:', table.name, '->', spatialTable, 'via', columnName)
                        break
                    }
                }
            }
        }
    }

    console.log('[Schema Inference] Inferred', relationships.length, 'relationships')
    return relationships
}

/**
 * Enhanced schema with inferred relationships
 */
export function enhanceSchemaWithRelationships(schema: SchemaDef): SchemaDef {
    const inferredRelationships = inferIfcRelationships(schema)

    return {
        ...schema,
        foreignKeys: [...schema.foreignKeys, ...inferredRelationships]
    }
}
