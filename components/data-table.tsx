"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeftIcon, SearchIcon, DownloadIcon, SortAscIcon, SortDescIcon, FilterIcon } from "lucide-react"

interface DataTableProps {
  tableName: string
  data: Record<string, any>[]
  onBack: () => void
}

export function DataTable({ tableName, data, onBack }: DataTableProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")

  // Get column names from the first row
  const columns = useMemo(() => {
    if (data.length === 0) return []
    return Object.keys(data[0])
  }, [data])

  // Filter and sort data
  const processedData = useMemo(() => {
    let filtered = data

    // Apply search filter
    if (searchTerm) {
      filtered = data.filter((row) =>
        Object.values(row).some((value) => String(value).toLowerCase().includes(searchTerm.toLowerCase())),
      )
    }

    // Apply sorting
    if (sortColumn) {
      filtered = [...filtered].sort((a, b) => {
        const aVal = a[sortColumn]
        const bVal = b[sortColumn]

        if (aVal === bVal) return 0

        const comparison = aVal < bVal ? -1 : 1
        return sortDirection === "asc" ? comparison : -comparison
      })
    }

    return filtered
  }, [data, searchTerm, sortColumn, sortDirection])

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortColumn(column)
      setSortDirection("asc")
    }
  }

  const exportToCSV = () => {
    if (processedData.length === 0) return

    const headers = columns.join(",")
    const rows = processedData.map((row) => columns.map((col) => `"${String(row[col]).replace(/"/g, '""')}"`).join(","))

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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm" onClick={onBack}>
              <ArrowLeftIcon className="w-4 h-4 mr-2" />
              Back
            </Button>
            <CardTitle className="font-serif text-xl">{tableName}</CardTitle>
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
        <div className="flex items-center space-x-4">
          <div className="relative flex-1 max-w-sm">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search records..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <FilterIcon className="w-4 h-4" />
            <span>
              Showing {processedData.length} of {data.length} records
            </span>
          </div>
        </div>

        {/* Data Table */}
        <div className="border rounded-lg">
          <ScrollArea className="h-[600px]">
            <Table>
              <TableHeader className="sticky top-0 bg-background">
                <TableRow>
                  {columns.map((column) => (
                    <TableHead
                      key={column}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
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
                {processedData.map((row, index) => (
                  <TableRow key={index} className="hover:bg-muted/50">
                    {columns.map((column) => (
                      <TableCell key={column} className="font-mono text-sm">
                        {String(row[column])}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>

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
