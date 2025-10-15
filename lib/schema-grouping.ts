import type { Node } from "reactflow"
import type { SchemaNodeData } from "@/lib/schema"

export type IfcEntityCategory =
    | 'spatial'
    | 'elements'
    | 'types'
    | 'relationships'
    | 'properties'
    | 'core'

export interface IfcGroup {
    category: IfcEntityCategory
    name: string
    nodes: Node<SchemaNodeData>[]
    order: number
}

const IFC_CATEGORY_ORDER: Record<IfcEntityCategory, number> = {
    spatial: 1,
    elements: 2,
    types: 3,
    relationships: 4,
    properties: 5,
    core: 6
}

const SPATIAL_ENTITIES = [
    'IfcSite', 'IfcBuilding', 'IfcBuildingStorey', 'IfcSpace', 'IfcZone',
    'IfcSpatialZone', 'IfcSpatialElement', 'IfcSpatialStructureElement'
]

const ELEMENT_ENTITIES = [
    'IfcWall', 'IfcSlab', 'IfcRoof', 'IfcDoor', 'IfcWindow', 'IfcColumn',
    'IfcBeam', 'IfcStair', 'IfcRailing', 'IfcChimney', 'IfcFurniture',
    'IfcBuildingElementProxy', 'IfcFlowSegment', 'IfcFlowTerminal',
    'IfcFlowController', 'IfcFlowFitting', 'IfcFlowStorageDevice',
    'IfcFlowTreatmentDevice', 'IfcDistributionElement', 'IfcElectricalElement',
    'IfcStructuralMember', 'IfcStructuralConnection'
]

const PROPERTY_ENTITIES = [
    'IfcPropertySet', 'IfcElementQuantity', 'IfcMaterial', 'IfcMaterialLayer',
    'IfcMaterialProfile', 'IfcMaterialConstituent', 'IfcClassification',
    'IfcClassificationReference', 'IfcExternalReference'
]

const CORE_ENTITIES = [
    'IfcProject', 'IfcApplication', 'IfcOwnerHistory', 'IfcPerson',
    'IfcOrganization', 'IfcPersonAndOrganization', 'IfcActorRole',
    'IfcAddress', 'IfcTelecomAddress', 'IfcPostalAddress'
]

/**
 * Determine the IFC entity category based on entity name
 */
export function getIfcEntityCategory(entityName: string): IfcEntityCategory {
    // Check for spatial entities
    if (SPATIAL_ENTITIES.some(entity => entityName === entity)) {
        return 'spatial'
    }

    // Check for element entities
    if (ELEMENT_ENTITIES.some(entity => entityName === entity)) {
        return 'elements'
    }

    // Check for type entities (suffix pattern)
    if (entityName.endsWith('Type')) {
        return 'types'
    }

    // Check for relationship entities (prefix pattern)
    if (entityName.startsWith('IfcRel')) {
        return 'relationships'
    }

    // Check for property entities
    if (PROPERTY_ENTITIES.some(entity => entityName === entity)) {
        return 'properties'
    }

    // Check for core entities
    if (CORE_ENTITIES.some(entity => entityName === entity)) {
        return 'core'
    }

    // Default fallback based on common patterns
    if (entityName.includes('Property') || entityName.includes('Quantity')) {
        return 'properties'
    }

    if (entityName.includes('Material') || entityName.includes('Classification')) {
        return 'properties'
    }

    // Default to core for unrecognized entities
    return 'core'
}

/**
 * Group nodes by IFC hierarchy categories
 */
export function groupNodesByIfcHierarchy(nodes: Node<SchemaNodeData>[]): Map<IfcEntityCategory, Node<SchemaNodeData>[]> {
    const groups = new Map<IfcEntityCategory, Node<SchemaNodeData>[]>()

    // Initialize empty arrays for each category
    Object.keys(IFC_CATEGORY_ORDER).forEach(category => {
        groups.set(category as IfcEntityCategory, [])
    })

    // Group nodes by category
    nodes.forEach(node => {
        const category = getIfcEntityCategory(node.id)
        const categoryNodes = groups.get(category) || []
        categoryNodes.push(node)
        groups.set(category, categoryNodes)
    })

    return groups
}

/**
 * Create ordered groups with metadata for layout algorithms
 */
export function createIfcGroups(nodes: Node<SchemaNodeData>[]): IfcGroup[] {
    const categoryGroups = groupNodesByIfcHierarchy(nodes)
    const groups: IfcGroup[] = []

    // Create groups in hierarchical order
    Object.entries(IFC_CATEGORY_ORDER)
        .sort(([, orderA], [, orderB]) => orderA - orderB)
        .forEach(([category, order]) => {
            const categoryNodes = categoryGroups.get(category as IfcEntityCategory) || []
            if (categoryNodes.length > 0) {
                groups.push({
                    category: category as IfcEntityCategory,
                    name: getCategoryDisplayName(category as IfcEntityCategory),
                    nodes: categoryNodes,
                    order
                })
            }
        })

    return groups
}

/**
 * Get display name for category
 */
function getCategoryDisplayName(category: IfcEntityCategory): string {
    const names: Record<IfcEntityCategory, string> = {
        spatial: 'Spatial Structure',
        elements: 'Building Elements',
        types: 'Element Types',
        relationships: 'Relationships',
        properties: 'Properties & Materials',
        core: 'Core Entities'
    }
    return names[category]
}

/**
 * Sort nodes within each category by name for consistent ordering
 */
export function sortNodesWithinCategories(groups: IfcGroup[]): IfcGroup[] {
    return groups.map(group => ({
        ...group,
        nodes: group.nodes.sort((a, b) => a.id.localeCompare(b.id))
    }))
}

/**
 * Get layout spacing configuration based on category
 */
export function getCategorySpacing(category: IfcEntityCategory): { horizontal: number; vertical: number } {
    const spacing: Record<IfcEntityCategory, { horizontal: number; vertical: number }> = {
        spatial: { horizontal: 350, vertical: 300 },
        elements: { horizontal: 320, vertical: 250 },
        types: { horizontal: 300, vertical: 200 },
        relationships: { horizontal: 280, vertical: 180 },
        properties: { horizontal: 300, vertical: 200 },
        core: { horizontal: 280, vertical: 180 }
    }
    return spacing[category]
}
