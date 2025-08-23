"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  ArrowLeftIcon,
  SearchIcon,
  DownloadIcon,
  SortAscIcon,
  SortDescIcon,
  FilterIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
} from "lucide-react"

interface DataTableProps {
  tableName: string
  data: Record<string, any>[]
  onBack: () => void
  customTitle?: string
  description?: string
}

export function DataTable({ tableName, data, onBack, customTitle, description }: DataTableProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(500) // Large default for IFC data

  const columns = useMemo(() => {
    if (data.length === 0) return []

    const allKeys = Object.keys(data[0])
    console.log(`DataTable: ${tableName} has ${data.length} rows`)
    console.log(`DataTable: All keys:`, allKeys)

    // Filter out columns that are completely empty
    const filteredColumns = allKeys.filter((column) => {
      // Always show essential columns
      if (['id', 'Type', 'Name', 'GlobalId'].includes(column)) {
        return true
      }

      // Always hide known empty columns
      const alwaysHideColumns = [
        'description', 'method_of_measurement', 'Description', 'MethodOfMeasurement',
        'LongName', 'LongDescription', 'UserDefinedPurpose', 'ApplicableOccurrence'
      ]
      if (alwaysHideColumns.includes(column)) {
        console.log(`DataTable: Hiding always-empty column: ${column}`)
        return false
      }

      // Check if all values in this column are empty
      const hasNonEmptyValues = data.some((row) => {
        const value = row[column]
        if (value === null || value === undefined) return false
        if (typeof value === 'string' && value.trim() === '') return false
        if (typeof value === 'object' && Object.keys(value).length === 0) return false
        return true
      })

      if (!hasNonEmptyValues) {
        console.log(`DataTable: Hiding empty column: ${column}`)
      }

      return hasNonEmptyValues
    })

    console.log(`DataTable: Showing ${filteredColumns.length} of ${allKeys.length} columns`)
    console.log(`DataTable: Hidden columns:`, allKeys.filter(col => !filteredColumns.includes(col)))

    return filteredColumns
  }, [data, tableName])

  const processedData = useMemo(() => {
    let filtered = data

    // Apply search filter
    if (searchTerm) {
      filtered = data.filter((row) =>
        Object.values(row).some((value) => {
          if (value === null || value === undefined) return false
          const stringValue = String(value).toLowerCase()
          return stringValue.includes(searchTerm.toLowerCase())
        }),
      )
    }

    // Apply sorting
    if (sortColumn) {
      filtered = [...filtered].sort((a, b) => {
        const aVal = a[sortColumn]
        const bVal = b[sortColumn]

        // Handle null/undefined values
        if (aVal === null || aVal === undefined) return 1
        if (bVal === null || bVal === undefined) return -1
        if (aVal === bVal) return 0

        // Try numeric comparison first
        const aNum = Number(aVal)
        const bNum = Number(bVal)
        if (!isNaN(aNum) && !isNaN(bNum)) {
          const comparison = aNum < bNum ? -1 : 1
          return sortDirection === "asc" ? comparison : -comparison
        }

        // Fall back to string comparison
        const comparison = String(aVal).localeCompare(String(bVal))
        return sortDirection === "asc" ? comparison : -comparison
      })
    }

    return filtered
  }, [data, searchTerm, sortColumn, sortDirection])

  const totalPages = Math.ceil(processedData.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const paginatedData = processedData.slice(startIndex, endIndex)

  useMemo(() => {
    setCurrentPage(1)
  }, [searchTerm, sortColumn, sortDirection])

  const formatCellValue = (value: any, column: string) => {
    if (value === null || value === undefined) return <span className="text-muted-foreground italic">null</span>

    const stringValue = String(value)

    if (stringValue === "[object Object]" && typeof value === "object" && value !== null) {
      // Check if it's an IFC entity reference with id
      if (value.id !== undefined) {
        return (
          <Badge variant="outline" className="text-xs">
            {value.type || "IFC Entity"} #{value.id}
          </Badge>
        )
      }

      // Check if it has a GlobalId (common IFC property)
      if (value.GlobalId) {
        return (
          <div className="space-y-1">
            <Badge variant="outline" className="text-xs">
              IFC Reference
            </Badge>
            <div className="text-xs text-muted-foreground font-mono">{value.GlobalId}</div>
          </div>
        )
      }

      const keys = Object.keys(value)
      if (keys.length > 0) {
        // Check for common IFC reference patterns
        if (keys.includes("ifc_id") || keys.includes("type") || keys.includes("ref")) {
          const displayText = value.type || value.ref || `ID: ${value.ifc_id || value.id || "Unknown"}`
          return (
            <Badge variant="outline" className="text-xs">
              {displayText}
            </Badge>
          )
        }

        // For complex objects, show more meaningful information
        return (
          <div className="space-y-1">
            <Badge variant="outline" className="text-xs">
              {value.constructor?.name || "Object"} ({keys.length} props)
            </Badge>
            <div className="text-xs text-muted-foreground max-h-20 overflow-y-auto">
              {keys.slice(0, 3).map((key) => {
                const val = value[key]
                let displayVal = ""

                if (val === null || val === undefined) {
                  displayVal = "null"
                } else if (typeof val === "object") {
                  displayVal = Array.isArray(val) ? `[Array(${val.length})]` : "[Object]"
                } else {
                  displayVal = String(val).substring(0, 30) + (String(val).length > 30 ? "..." : "")
                }

                return (
                  <div key={key} className="font-mono">
                    {key}: {displayVal}
                  </div>
                )
              })}
              {keys.length > 3 && <div className="italic">+{keys.length - 3} more</div>}
            </div>
          </div>
        )
      }

      // Fallback for empty objects
      console.log(`Empty Object detected for column ${column}:`, value, typeof value, Object.keys(value || {}))
      return (
        <Badge variant="secondary" className="text-xs">
          Empty Object
        </Badge>
      )
    }

    // Handle JSON data
    if (column === "inverses" || column === "materials" || stringValue.startsWith("[") || stringValue.startsWith("{")) {
      try {
        const parsed = JSON.parse(stringValue)
        if (Array.isArray(parsed)) {
          return (
            <div className="space-y-1">
              <Badge variant="outline" className="text-xs">
                Array ({parsed.length})
              </Badge>
              {parsed.length > 0 && (
                <div className="text-xs text-muted-foreground max-h-20 overflow-y-auto">
                  {parsed.slice(0, 3).map((item, idx) => (
                    <div key={idx} className="font-mono">
                      {typeof item === "object" ? JSON.stringify(item).substring(0, 50) + "..." : String(item)}
                    </div>
                  ))}
                  {parsed.length > 3 && <div className="italic">+{parsed.length - 3} more items</div>}
                </div>
              )}
            </div>
          )
        } else if (typeof parsed === "object") {
          const keys = Object.keys(parsed)
          return (
            <div className="space-y-1">
              <Badge variant="outline" className="text-xs">
                Object ({keys.length} keys)
              </Badge>
              {keys.length > 0 && (
                <div className="text-xs text-muted-foreground max-h-20 overflow-y-auto">
                  {keys.slice(0, 3).map((key) => (
                    <div key={key} className="font-mono">
                      {key}: {String(parsed[key]).substring(0, 30)}...
                    </div>
                  ))}
                  {keys.length > 3 && <div className="italic">+{keys.length - 3} more keys</div>}
                </div>
              )}
            </div>
          )
        }
      } catch {
        // Not JSON, continue with normal formatting
      }
    }

    // Handle binary data
    if (
      column.includes("blob") ||
      column === "matrix" ||
      column === "verts" ||
      column === "faces" ||
      column === "edges"
    ) {
      return (
        <Badge variant="secondary" className="text-xs">
          Binary Data
        </Badge>
      )
    }

    // Handle long text
    if (stringValue.length > 100) {
      return (
        <span title={stringValue} className="cursor-help">
          {stringValue.substring(0, 100)}...
        </span>
      )
    }

    // Handle numeric values with better formatting
    if (!isNaN(Number(value)) && value !== "" && column !== "ifc_id") {
      const num = Number(value)
      if (num % 1 !== 0 && Math.abs(num) < 1000) {
        return num.toFixed(3)
      }
    }

    return stringValue
  }

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortColumn(column)
      setSortDirection("asc")
    }
  }

  const goToFirstPage = () => setCurrentPage(1)
  const goToPreviousPage = () => setCurrentPage(Math.max(1, currentPage - 1))
  const goToNextPage = () => setCurrentPage(Math.min(totalPages, currentPage + 1))
  const goToLastPage = () => setCurrentPage(totalPages)

  const handlePageSizeChange = (newPageSize: string) => {
    setPageSize(Number(newPageSize))
    setCurrentPage(1)
  }

  const exportToCSV = () => {
    if (processedData.length === 0) return

    const headers = columns.join(",")
    const rows = processedData.map((row) =>
      columns
        .map((col) => {
          const value = row[col]
          if (value === null || value === undefined) return '""'
          return `"${String(value).replace(/"/g, '""')}"`
        })
        .join(","),
    )

    const csv = [headers, ...rows].join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)

    const a = document.createElement("a")
    a.href = url
    a.download = `${tableName}.csv`
    a.click()

    URL.revokeObjectURL(url)
  }

  return (
    <Card className="!rounded-[4px]">
      <CardHeader>
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm" onClick={onBack}>
              <ArrowLeftIcon className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <CardTitle className="font-inter text-xl">{customTitle || tableName}</CardTitle>
              {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
            </div>
            <Badge variant="secondary">
              {processedData.length} of {data.length} records
            </Badge>
          </div>
          <Button variant="outline" size="sm" onClick={exportToCSV}>
            <DownloadIcon className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Search and Filter Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 max-w-sm">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search records..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-8"
              />
            </div>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <FilterIcon className="w-4 h-4" />
              <span>
                Showing {startIndex + 1}-{Math.min(endIndex, processedData.length)} of {processedData.length} records
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">Rows per page:</span>
            <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
                <SelectItem value="250">250</SelectItem>
                <SelectItem value="500">500</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Data Table */}
        <div className="border rounded-[4px]">
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <Table className="min-w-full">
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  {columns.map((column) => (
                    <TableHead
                      key={column}
                      className="cursor-pointer hover:bg-muted/50 transition-colors whitespace-nowrap px-3 py-2 text-xs"
                      onClick={() => handleSort(column)}
                    >
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{column}</span>
                        {sortColumn === column &&
                          (sortDirection === "asc" ? (
                            <SortAscIcon className="w-4 h-4" />
                          ) : (
                            <SortDescIcon className="w-4 h-4" />
                          ))}
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.map((row, index) => (
                  <TableRow key={startIndex + index} className="hover:bg-muted/50">
                    {columns.map((column) => (
                      <TableCell key={column} className="font-mono text-[12px] whitespace-nowrap px-3 py-2">
                        {formatCellValue(row[column], column)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={goToFirstPage} disabled={currentPage === 1}>
                <ChevronsLeftIcon className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToPreviousPage} disabled={currentPage === 1}>
                <ChevronLeftIcon className="w-4 h-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <Button variant="outline" size="sm" onClick={goToNextPage} disabled={currentPage === totalPages}>
                <ChevronRightIcon className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToLastPage} disabled={currentPage === totalPages}>
                <ChevronsRightIcon className="w-4 h-4" />
              </Button>
            </div>

            <div className="text-sm text-muted-foreground">{processedData.length} total records</div>
          </div>
        )}

        {processedData.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <SearchIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No records found matching your search criteria.</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
