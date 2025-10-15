"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    LayoutGridIcon,
    NetworkIcon,
    CircleIcon,
    Grid3X3Icon,
    FilterIcon,
    RotateCcwIcon,
    MaximizeIcon,
    SettingsIcon,
} from "lucide-react"

import type { LayoutAlgorithm } from "@/lib/schema-layout"
import type { RelationshipFilter } from "@/lib/schema-filter"

interface SchemaToolbarProps {
    currentLayout: LayoutAlgorithm
    currentFilters: RelationshipFilter
    onLayoutChange: (layout: LayoutAlgorithm) => void
    onFilterChange: (filters: RelationshipFilter) => void
    onResetLayout: () => void
    onFitView: () => void
    edgeCount: number
    filteredEdgeCount: number
}

const LAYOUT_OPTIONS = [
    {
        value: 'grid' as LayoutAlgorithm,
        label: 'Grid',
        description: 'Grid layout with IFC grouping',
        icon: Grid3X3Icon
    },
    {
        value: 'hierarchical' as LayoutAlgorithm,
        label: 'Hierarchical',
        description: 'IFC hierarchy with spatial → elements → types',
        icon: LayoutGridIcon
    },
    {
        value: 'force' as LayoutAlgorithm,
        label: 'Force-Directed',
        description: 'Organic layout based on relationships',
        icon: NetworkIcon
    },
    {
        value: 'circular' as LayoutAlgorithm,
        label: 'Circular',
        description: 'Circular arrangement of entities',
        icon: CircleIcon
    }
]

export function SchemaToolbar({
    currentLayout,
    currentFilters,
    onLayoutChange,
    onFilterChange,
    onResetLayout,
    onFitView,
    edgeCount,
    filteredEdgeCount
}: SchemaToolbarProps) {
    const [showFilters, setShowFilters] = useState(false)

    const currentLayoutOption = LAYOUT_OPTIONS.find(opt => opt.value === currentLayout)
    const CurrentLayoutIcon = currentLayoutOption?.icon || LayoutGridIcon

    const handleFilterToggle = (filterKey: keyof RelationshipFilter) => {
        const newFilters = { ...currentFilters }

        if (filterKey === 'showAll') {
            // Toggle all filters
            const newShowAll = !currentFilters.showAll
            newFilters.showAll = newShowAll
            if (newShowAll) {
                // Enable all individual filters
                newFilters.showOwnerHistory = true
                newFilters.showSpatial = true
                newFilters.showProperties = true
                newFilters.showTypes = true
                newFilters.showMaterials = true
                newFilters.showClassifications = true
            }
        } else {
            // Toggle individual filter
            newFilters[filterKey] = !currentFilters[filterKey]

            // Update showAll based on individual filters
            const allEnabled = newFilters.showOwnerHistory &&
                newFilters.showSpatial &&
                newFilters.showProperties &&
                newFilters.showTypes &&
                newFilters.showMaterials &&
                newFilters.showClassifications
            newFilters.showAll = allEnabled
        }

        onFilterChange(newFilters)
    }

    return (
        <div className="flex items-center justify-between">
            <div>
                <h3 className="text-sm font-medium text-foreground">Entity Relationship Graph</h3>
                <p className="text-xs text-muted-foreground">
                    Drag tables to refine layout.
                </p>
                {edgeCount !== filteredEdgeCount && (
                    <p className="text-xs text-muted-foreground">
                        Showing {filteredEdgeCount} of {edgeCount} relationships
                    </p>
                )}
            </div>

            <div className="flex items-center gap-2">
                {/* Layout Controls */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-2">
                            <CurrentLayoutIcon className="h-4 w-4" />
                            {currentLayoutOption?.label}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-64">
                        <DropdownMenuLabel>Layout Algorithm</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuRadioGroup value={currentLayout} onValueChange={onLayoutChange}>
                            {LAYOUT_OPTIONS.map((option) => {
                                const Icon = option.icon
                                return (
                                    <DropdownMenuRadioItem key={option.value} value={option.value}>
                                        <div className="flex items-center gap-2">
                                            <Icon className="h-4 w-4" />
                                            <div>
                                                <div className="font-medium">{option.label}</div>
                                                <div className="text-xs text-muted-foreground">{option.description}</div>
                                            </div>
                                        </div>
                                    </DropdownMenuRadioItem>
                                )
                            })}
                        </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* Relationship Filters */}
                <DropdownMenu open={showFilters} onOpenChange={setShowFilters}>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="outline"
                            size="sm"
                            className={`gap-2 ${edgeCount !== filteredEdgeCount ? 'bg-orange-50 border-orange-200 text-orange-700' : ''}`}
                        >
                            <FilterIcon className="h-4 w-4" />
                            Filters
                            {edgeCount !== filteredEdgeCount && (
                                <span className="ml-1 px-1.5 py-0.5 text-xs bg-orange-200 text-orange-800 rounded-full">
                                    {edgeCount - filteredEdgeCount}
                                </span>
                            )}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>Relationship Filters</DropdownMenuLabel>
                        <DropdownMenuSeparator />

                        <DropdownMenuItem
                            onClick={() => handleFilterToggle('showAll')}
                            className="font-medium"
                        >
                            <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded border ${currentFilters.showAll ? 'bg-primary border-primary' : 'border-muted-foreground'}`}>
                                    {currentFilters.showAll && <div className="w-full h-full bg-white rounded-sm scale-50" />}
                                </div>
                                Show All Relationships
                            </div>
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        <DropdownMenuItem onClick={() => handleFilterToggle('showOwnerHistory')}>
                            <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded border ${currentFilters.showOwnerHistory ? 'bg-primary border-primary' : 'border-muted-foreground'}`}>
                                    {currentFilters.showOwnerHistory && <div className="w-full h-full bg-white rounded-sm scale-50" />}
                                </div>
                                Owner History
                            </div>
                        </DropdownMenuItem>

                        <DropdownMenuItem onClick={() => handleFilterToggle('showSpatial')}>
                            <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded border ${currentFilters.showSpatial ? 'bg-primary border-primary' : 'border-muted-foreground'}`}>
                                    {currentFilters.showSpatial && <div className="w-full h-full bg-white rounded-sm scale-50" />}
                                </div>
                                Spatial Structure
                            </div>
                        </DropdownMenuItem>

                        <DropdownMenuItem onClick={() => handleFilterToggle('showProperties')}>
                            <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded border ${currentFilters.showProperties ? 'bg-primary border-primary' : 'border-muted-foreground'}`}>
                                    {currentFilters.showProperties && <div className="w-full h-full bg-white rounded-sm scale-50" />}
                                </div>
                                Properties
                            </div>
                        </DropdownMenuItem>

                        <DropdownMenuItem onClick={() => handleFilterToggle('showTypes')}>
                            <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded border ${currentFilters.showTypes ? 'bg-primary border-primary' : 'border-muted-foreground'}`}>
                                    {currentFilters.showTypes && <div className="w-full h-full bg-white rounded-sm scale-50" />}
                                </div>
                                Element Types
                            </div>
                        </DropdownMenuItem>

                        <DropdownMenuItem onClick={() => handleFilterToggle('showMaterials')}>
                            <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded border ${currentFilters.showMaterials ? 'bg-primary border-primary' : 'border-muted-foreground'}`}>
                                    {currentFilters.showMaterials && <div className="w-full h-full bg-white rounded-sm scale-50" />}
                                </div>
                                Materials
                            </div>
                        </DropdownMenuItem>

                        <DropdownMenuItem onClick={() => handleFilterToggle('showClassifications')}>
                            <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded border ${currentFilters.showClassifications ? 'bg-primary border-primary' : 'border-muted-foreground'}`}>
                                    {currentFilters.showClassifications && <div className="w-full h-full bg-white rounded-sm scale-50" />}
                                </div>
                                Classifications
                            </div>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* View Controls */}
                <Button variant="outline" size="sm" onClick={onResetLayout} className="gap-2">
                    <RotateCcwIcon className="h-4 w-4" />
                    Reset
                </Button>

                <Button variant="outline" size="sm" onClick={onFitView} className="gap-2">
                    <MaximizeIcon className="h-4 w-4" />
                    Fit View
                </Button>
            </div>
        </div>
    )
}
