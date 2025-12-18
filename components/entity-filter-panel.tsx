"use client"

import { useState, useMemo, useCallback, useRef, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FilterIcon, XIcon, SearchIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react"

// Custom debounce hook for search inputs
function useDebouncedCallback<T extends (...args: any[]) => void>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      timeoutRef.current = setTimeout(() => {
        callback(...args)
      }, delay)
    },
    [callback, delay]
  ) as T
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])
  
  return debouncedCallback
}

export interface EntityFilter {
  entityTypes: string[]
  entityNameSearch: string
  // Type-specific filters
  propertySetNames?: string[]
  quantityTypes?: string[]
  materialTypes?: string[]
}

export interface EntityFilterPanelProps {
  availableEntityTypes: string[]
  availablePropertySets?: string[]
  availableQuantityTypes?: string[]
  availableMaterialTypes?: string[]
  filter: EntityFilter
  onFilterChange: (filter: EntityFilter) => void
  filterType: "properties" | "quantities" | "materials"
  resultCount?: number
  totalCount?: number
  compact?: boolean // Compact inline mode for header integration
}

export function EntityFilterPanel({
  availableEntityTypes,
  availablePropertySets = [],
  availableQuantityTypes = [],
  availableMaterialTypes = [],
  filter,
  onFilterChange,
  filterType,
  resultCount,
  totalCount,
  compact = false,
}: EntityFilterPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false) // Collapsed by default
  const panelRef = useRef<HTMLDivElement>(null)
  
  // Local state for search inputs (updates immediately for responsive UI)
  const [localNameSearch, setLocalNameSearch] = useState(filter.entityNameSearch)
  
  // Sync local state when filter prop changes externally (e.g., clear all)
  useEffect(() => {
    setLocalNameSearch(filter.entityNameSearch)
  }, [filter.entityNameSearch])
  

  const updateFilter = useCallback((updates: Partial<EntityFilter>) => {
    onFilterChange({ ...filter, ...updates })
  }, [filter, onFilterChange])
  
  // Debounced search handlers (300ms delay)
  const debouncedNameSearch = useDebouncedCallback(
    (value: string) => {
      // When name search is set, clear entity types (mutually exclusive)
      // When name search is cleared, keep current entity types
      onFilterChange({ 
        ...filter,
        entityNameSearch: value,
        entityTypes: value ? [] : filter.entityTypes
      })
    },
    300
  )
  
  // Handle search input changes
  const handleNameSearchChange = (value: string) => {
    setLocalNameSearch(value) // Update UI immediately
    debouncedNameSearch(value) // Debounce the actual filter update
  }
  
  // Handle entity type changes - clear name search when type is selected (mutually exclusive)
  const handleEntityTypeChange = (value: string) => {
    if (value === "__all__") {
      updateFilter({ entityTypes: [] })
    } else {
      updateFilter({ 
        entityTypes: [value],
        entityNameSearch: "" // Clear name search when type is selected
      })
      setLocalNameSearch("") // Clear local state immediately
    }
  }

  const clearFilter = (filterKey: keyof EntityFilter) => {
    if (filterKey === "entityTypes") {
      updateFilter({ entityTypes: [] })
    } else if (filterKey === "entityNameSearch") {
      updateFilter({ entityNameSearch: "" })
      setLocalNameSearch("")
    } else if (filterKey === "propertySetNames") {
      updateFilter({ propertySetNames: [] })
    } else if (filterKey === "quantityTypes") {
      updateFilter({ quantityTypes: [] })
    } else if (filterKey === "materialTypes") {
      updateFilter({ materialTypes: [] })
    }
  }

  const clearAllFilters = () => {
    setLocalNameSearch("")
    onFilterChange({
      entityTypes: [],
      entityNameSearch: "",
      propertySetNames: [],
      quantityTypes: [],
      materialTypes: [],
    })
  }

  const hasActiveFilters = useMemo(() => {
    return (
      filter.entityTypes.length > 0 ||
      localNameSearch.length > 0 ||
      (filter.propertySetNames && filter.propertySetNames.length > 0) ||
      (filter.quantityTypes && filter.quantityTypes.length > 0) ||
      (filter.materialTypes && filter.materialTypes.length > 0)
    )
  }, [filter, localNameSearch])

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filter.entityTypes.length > 0) count++
    if (localNameSearch.length > 0) count++
    if (filter.propertySetNames && filter.propertySetNames.length > 0) count++
    if (filter.quantityTypes && filter.quantityTypes.length > 0) count++
    if (filter.materialTypes && filter.materialTypes.length > 0) count++
    return count
  }, [filter, localNameSearch])

  // Get active filter labels for collapsed view
  const activeFilterLabels = useMemo(() => {
    const labels: string[] = []
    if (filter.entityTypes.length > 0) {
      labels.push(`Type: ${filter.entityTypes[0]}`)
    }
    if (localNameSearch.length > 0) {
      labels.push(`Name: "${localNameSearch.substring(0, 20)}${localNameSearch.length > 20 ? '...' : ''}"`)
    }
    if (filter.propertySetNames && filter.propertySetNames.length > 0) {
      labels.push(`Pset: ${filter.propertySetNames[0]}`)
    }
    if (filter.quantityTypes && filter.quantityTypes.length > 0) {
      labels.push(`Qty: ${filter.quantityTypes[0]}`)
    }
    if (filter.materialTypes && filter.materialTypes.length > 0) {
      labels.push(`Mat: ${filter.materialTypes[0]}`)
    }
    return labels
  }, [filter, localNameSearch])

  // Render filter form content
  const renderFilterContent = () => (
    <>
      {/* Entity Type Filter - Only for properties (building elements) */}
      {filterType === "properties" && availableEntityTypes.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Entity Type</label>
            {filter.entityTypes.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => clearFilter("entityTypes")}
                className="h-6 px-2 text-xs"
              >
                <XIcon className="w-3 h-3 mr-1" />
                Clear
              </Button>
            )}
          </div>
          <Select
            value={filter.entityTypes.length > 0 ? filter.entityTypes[0] : "__all__"}
            onValueChange={handleEntityTypeChange}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All entity types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All entity types</SelectItem>
              {availableEntityTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {filter.entityTypes.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {filter.entityTypes.map((type) => (
                <Badge key={type} variant="secondary" className="text-xs">
                  {type}
                  <button
                    onClick={() => {
                      updateFilter({
                        entityTypes: filter.entityTypes.filter((t) => t !== type),
                      })
                    }}
                    className="ml-1 hover:text-destructive"
                  >
                    <XIcon className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Entity Name Search */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Entity Name</label>
          {localNameSearch.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setLocalNameSearch("")
                clearFilter("entityNameSearch")
              }}
              className="h-6 px-2 text-xs"
            >
              <XIcon className="w-3 h-3 mr-1" />
              Clear
            </Button>
          )}
        </div>
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by entity name..."
            value={localNameSearch}
            onChange={(e) => handleNameSearchChange(e.target.value)}
            className="pl-10 h-9"
          />
        </div>
      </div>

      {/* Type-Specific Filters */}
      {filterType === "properties" && availablePropertySets.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Property Set</label>
            {filter.propertySetNames && filter.propertySetNames.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => clearFilter("propertySetNames")}
                className="h-6 px-2 text-xs"
              >
                <XIcon className="w-3 h-3 mr-1" />
                Clear
              </Button>
            )}
          </div>
          <Select
            value={filter.propertySetNames && filter.propertySetNames.length > 0 ? filter.propertySetNames[0] : "__all__"}
            onValueChange={(value) => {
              if (value === "__all__") {
                updateFilter({ propertySetNames: [] })
              } else {
                updateFilter({ propertySetNames: [value] })
              }
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All property sets" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All property sets</SelectItem>
              {availablePropertySets.map((pset) => (
                <SelectItem key={pset} value={pset}>
                  {pset}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {filter.propertySetNames && filter.propertySetNames.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {filter.propertySetNames.map((pset) => (
                <Badge key={pset} variant="secondary" className="text-xs">
                  {pset}
                  <button
                    onClick={() => {
                      updateFilter({
                        propertySetNames: filter.propertySetNames?.filter((p) => p !== pset) || [],
                      })
                    }}
                    className="ml-1 hover:text-destructive"
                  >
                    <XIcon className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}

      {filterType === "quantities" && availableQuantityTypes.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Quantity Type</label>
            {filter.quantityTypes && filter.quantityTypes.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => clearFilter("quantityTypes")}
                className="h-6 px-2 text-xs"
              >
                <XIcon className="w-3 h-3 mr-1" />
                Clear
              </Button>
            )}
          </div>
          <Select
            value={filter.quantityTypes && filter.quantityTypes.length > 0 ? filter.quantityTypes[0] : "__all__"}
            onValueChange={(value) => {
              if (value === "__all__") {
                updateFilter({ quantityTypes: [] })
              } else {
                updateFilter({ quantityTypes: [value] })
              }
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All quantity types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All quantity types</SelectItem>
              {availableQuantityTypes.map((qty) => (
                <SelectItem key={qty} value={qty}>
                  {qty}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {filter.quantityTypes && filter.quantityTypes.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {filter.quantityTypes.map((qty) => (
                <Badge key={qty} variant="secondary" className="text-xs">
                  {qty}
                  <button
                    onClick={() => {
                      updateFilter({
                        quantityTypes: filter.quantityTypes?.filter((q) => q !== qty) || [],
                      })
                    }}
                    className="ml-1 hover:text-destructive"
                  >
                    <XIcon className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}

      {filterType === "materials" && availableMaterialTypes.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Material Type</label>
            {filter.materialTypes && filter.materialTypes.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => clearFilter("materialTypes")}
                className="h-6 px-2 text-xs"
              >
                <XIcon className="w-3 h-3 mr-1" />
                Clear
              </Button>
            )}
          </div>
          <Select
            value={filter.materialTypes && filter.materialTypes.length > 0 ? filter.materialTypes[0] : "__all__"}
            onValueChange={(value) => {
              if (value === "__all__") {
                updateFilter({ materialTypes: [] })
              } else {
                updateFilter({ materialTypes: [value] })
              }
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All material types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All material types</SelectItem>
              {availableMaterialTypes.map((mat) => (
                <SelectItem key={mat} value={mat}>
                  {mat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {filter.materialTypes && filter.materialTypes.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {filter.materialTypes.map((mat) => (
                <Badge key={mat} variant="secondary" className="text-xs">
                  {mat}
                  <button
                    onClick={() => {
                      updateFilter({
                        materialTypes: filter.materialTypes?.filter((m) => m !== mat) || [],
                      })
                    }}
                    className="ml-1 hover:text-destructive"
                  >
                    <XIcon className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  )

  // Compact inline mode for header integration
  if (compact) {
    return (
      <div className="w-full" ref={panelRef}>
        {/* Compact collapsed view */}
        <div className="flex items-center justify-between py-2 border-b">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-7 text-xs gap-1.5"
          >
            <FilterIcon className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs">Filters</span>
            {hasActiveFilters && (
              <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                {activeFilterCount}
              </Badge>
            )}
            {hasActiveFilters && activeFilterLabels.length > 0 && (
              <span className="text-xs text-muted-foreground max-w-[200px] truncate">
                {activeFilterLabels[0]}
              </span>
            )}
            {isExpanded ? (
              <ChevronUpIcon className="w-3 h-3 text-muted-foreground" />
            ) : (
              <ChevronDownIcon className="w-3 h-3 text-muted-foreground" />
            )}
          </Button>
          {hasActiveFilters && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearAllFilters} 
              className="h-7 text-xs"
            >
              Clear All
            </Button>
          )}
        </div>
        
        {/* Expanded panel - inline section that expands downward */}
        {isExpanded && (
          <div className="w-full border-b bg-muted/30">
            <CardContent className="pt-4 pb-4 space-y-4">
              {renderFilterContent()}
            </CardContent>
          </div>
        )}
      </div>
    )
  }

  // Full card mode (original)
  return (
    <Card className="!rounded-[4px] mb-4">
      <div 
        className={`flex items-center justify-between p-4 ${!isExpanded ? 'cursor-pointer hover:bg-muted/50 transition-colors' : 'border-b'}`}
        onClick={() => !isExpanded && setIsExpanded(true)}
      >
        <div className="flex items-center gap-3 flex-wrap flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <FilterIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span className="font-medium text-sm">Filters</span>
            {hasActiveFilters && (
              <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                {activeFilterCount}
              </Badge>
            )}
          </div>
          
          {/* Show active filters in collapsed view */}
          {!isExpanded && (
            <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
              {hasActiveFilters ? (
                activeFilterLabels.map((label, idx) => (
                  <Badge 
                    key={idx} 
                    variant="outline" 
                    className="text-xs h-5 px-2 font-normal"
                  >
                    {label}
                  </Badge>
                ))
              ) : (
                <span className="text-xs text-muted-foreground italic">
                  No filters active
                </span>
              )}
            </div>
          )}
          
          {resultCount !== undefined && totalCount !== undefined && (
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              Showing {resultCount.toLocaleString()} of {totalCount.toLocaleString()}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2 ml-2" onClick={(e) => e.stopPropagation()}>
          {hasActiveFilters && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={(e) => {
                e.stopPropagation()
                clearAllFilters()
              }} 
              className="h-7 text-xs"
            >
              Clear All
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              setIsExpanded(!isExpanded)
            }}
            className="h-7 w-7 p-0"
            title={isExpanded ? "Collapse filters" : "Expand filters"}
          >
            {isExpanded ? (
              <ChevronUpIcon className="w-4 h-4" />
            ) : (
              <ChevronDownIcon className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {isExpanded && (
        <CardContent className="pt-4 space-y-4">
          {renderFilterContent()}
        </CardContent>
      )}
    </Card>
  )
}
