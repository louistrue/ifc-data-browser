import type { Edge } from "reactflow"

export interface RelationshipFilter {
    showOwnerHistory: boolean
    showSpatial: boolean
    showProperties: boolean
    showTypes: boolean
    showMaterials: boolean
    showClassifications: boolean
    showAll: boolean
}

export const DEFAULT_RELATIONSHIP_FILTER: RelationshipFilter = {
    showOwnerHistory: true,
    showSpatial: true,
    showProperties: true,
    showTypes: true,
    showMaterials: true,
    showClassifications: true,
    showAll: true
}

/**
 * Determine the relationship type from edge ID or handles
 */
export function getRelationshipType(edge: Edge): string {
    const edgeId = edge.id.toLowerCase()
    const sourceHandle = edge.sourceHandle?.toLowerCase() || ''
    const targetHandle = edge.targetHandle?.toLowerCase() || ''

    // Check for OwnerHistory relationships
    if (edgeId.includes('ownerhistory') || sourceHandle.includes('ownerhistory') || targetHandle.includes('ownerhistory')) {
        return 'ownerhistory'
    }

    // Check for spatial relationships
    if (edgeId.includes('spatial') || edgeId.includes('structure') || edgeId.includes('space') ||
        sourceHandle.includes('spatial') || targetHandle.includes('spatial') ||
        sourceHandle.includes('structure') || targetHandle.includes('structure') ||
        sourceHandle.includes('space') || targetHandle.includes('space')) {
        return 'spatial'
    }

    // Check for property relationships
    if (edgeId.includes('property') || edgeId.includes('quantity') ||
        sourceHandle.includes('property') || targetHandle.includes('property') ||
        sourceHandle.includes('quantity') || targetHandle.includes('quantity')) {
        return 'properties'
    }

    // Check for type relationships
    if (edgeId.includes('type') || edgeId.includes('typedby') ||
        sourceHandle.includes('type') || targetHandle.includes('type') ||
        sourceHandle.includes('typedby') || targetHandle.includes('typedby')) {
        return 'types'
    }

    // Check for material relationships
    if (edgeId.includes('material') || edgeId.includes('relatingmaterial') ||
        sourceHandle.includes('material') || targetHandle.includes('material') ||
        sourceHandle.includes('relatingmaterial') || targetHandle.includes('relatingmaterial')) {
        return 'materials'
    }

    // Check for classification relationships
    if (edgeId.includes('classification') || edgeId.includes('relatingclassification') ||
        sourceHandle.includes('classification') || targetHandle.includes('classification') ||
        sourceHandle.includes('relatingclassification') || targetHandle.includes('relatingclassification')) {
        return 'classifications'
    }

    // Default to 'other' for unrecognized relationships
    return 'other'
}

/**
 * Filter edges based on relationship type and filter settings
 */
export function filterEdgesByRelationships(
    edges: Edge[],
    filter: RelationshipFilter
): Edge[] {
    if (filter.showAll) {
        return edges
    }

    return edges.filter(edge => {
        const relationshipType = getRelationshipType(edge)

        switch (relationshipType) {
            case 'ownerhistory':
                return filter.showOwnerHistory
            case 'spatial':
                return filter.showSpatial
            case 'properties':
                return filter.showProperties
            case 'types':
                return filter.showTypes
            case 'materials':
                return filter.showMaterials
            case 'classifications':
                return filter.showClassifications
            default:
                return true // Always show 'other' relationships
        }
    })
}

/**
 * Get count of edges by relationship type
 */
export function getRelationshipCounts(edges: Edge[]): Record<string, number> {
    const counts: Record<string, number> = {
        ownerhistory: 0,
        spatial: 0,
        properties: 0,
        types: 0,
        materials: 0,
        classifications: 0,
        other: 0
    }

    edges.forEach(edge => {
        const relationshipType = getRelationshipType(edge)
        counts[relationshipType] = (counts[relationshipType] || 0) + 1
    })

    return counts
}

/**
 * Get display name for relationship type
 */
export function getRelationshipDisplayName(type: string): string {
    const names: Record<string, string> = {
        ownerhistory: 'Owner History',
        spatial: 'Spatial Structure',
        properties: 'Properties',
        types: 'Element Types',
        materials: 'Materials',
        classifications: 'Classifications',
        other: 'Other'
    }
    return names[type] || type
}

/**
 * Check if any edges would be hidden with current filter
 */
export function hasHiddenEdges(edges: Edge[], filter: RelationshipFilter): boolean {
    if (filter.showAll) {
        return false
    }

    const filteredEdges = filterEdgesByRelationships(edges, filter)
    return filteredEdges.length < edges.length
}

/**
 * Get summary of filtered edges
 */
export function getFilterSummary(edges: Edge[], filter: RelationshipFilter): string {
    if (filter.showAll) {
        return `Showing all ${edges.length} relationships`
    }

    const filteredEdges = filterEdgesByRelationships(edges, filter)
    const hiddenCount = edges.length - filteredEdges.length

    if (hiddenCount === 0) {
        return `Showing all ${edges.length} relationships`
    }

    return `Showing ${filteredEdges.length} of ${edges.length} relationships (${hiddenCount} hidden)`
}
