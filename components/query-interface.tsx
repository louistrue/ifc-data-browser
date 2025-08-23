"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PlayIcon, DatabaseIcon, InfoIcon, BookOpenIcon, CopyIcon } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface QueryInterfaceProps {
  tables: string[]
  entities: Record<string, any[]>
}

const sampleQueries = [
  {
    name: "All Walls",
    description: "Get all wall entities with their properties",
    sql: "SELECT * FROM IfcWall;",
  },
  {
    name: "Count by Type",
    description: "Count entities by their IFC type",
    sql: "SELECT 'IfcWall' as Type, COUNT(*) as Count FROM IfcWall\nUNION ALL\nSELECT 'IfcDoor' as Type, COUNT(*) as Count FROM IfcDoor\nUNION ALL\nSELECT 'IfcWindow' as Type, COUNT(*) as Count FROM IfcWindow;",
  },
  {
    name: "Named Elements",
    description: "Find all elements with specific names",
    sql: "SELECT Name, Description, ObjectType FROM IfcWall WHERE Name IS NOT NULL;",
  },
]

export function QueryInterface({ tables, entities }: QueryInterfaceProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<any[] | null>(null)
  const [isExecuting, setIsExecuting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const executeQuery = async () => {
    if (!query.trim()) return

    setIsExecuting(true)
    setError(null)
    setResults(null)

    try {
      // Mock SQL execution - in real implementation, this would use SQLite WASM
      await new Promise((resolve) => setTimeout(resolve, 500)) // Simulate processing

      // Simple query parsing for demonstration
      const trimmedQuery = query.trim().toLowerCase()

      if (trimmedQuery.includes("select * from ifcwall")) {
        setResults(entities.IfcWall || [])
      } else if (trimmedQuery.includes("select * from ifcdoor")) {
        setResults(entities.IfcDoor || [])
      } else if (trimmedQuery.includes("select * from ifcwindow")) {
        setResults(entities.IfcWindow || [])
      } else if (trimmedQuery.includes("select * from ifcspace")) {
        setResults(entities.IfcSpace || [])
      } else if (trimmedQuery.includes("count(*)")) {
        // Mock count query
        const countResults = tables.map((table) => ({
          Type: table,
          Count: entities[table]?.length || 0,
        }))
        setResults(countResults)
      } else {
        // Default to showing first table data
        setResults(entities[tables[0]] || [])
      }

      toast({
        title: "Query executed successfully",
        description: `Returned ${results?.length || 0} rows`,
      })
    } catch (err) {
      setError("Failed to execute query. Please check your SQL syntax.")
    } finally {
      setIsExecuting(false)
    }
  }

  const loadSampleQuery = (sampleQuery: (typeof sampleQueries)[0]) => {
    setQuery(sampleQuery.sql)
    setResults(null)
    setError(null)
  }

  const copyQuery = (sql: string) => {
    navigator.clipboard.writeText(sql)
    toast({
      title: "Query copied",
      description: "SQL query copied to clipboard",
    })
  }

  const getResultColumns = () => {
    if (!results || results.length === 0) return []
    return Object.keys(results[0])
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Query Editor */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <DatabaseIcon className="w-5 h-5" />
                <span>SQL Query Editor</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Enter your SQL query here..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="min-h-[200px] font-mono text-sm"
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Button onClick={executeQuery} disabled={!query.trim() || isExecuting}>
                    <PlayIcon className="w-4 h-4 mr-2" />
                    {isExecuting ? "Executing..." : "Execute Query"}
                  </Button>
                  {results && <Badge variant="secondary">{results.length} rows returned</Badge>}
                </div>
              </div>
              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Query Results */}
          {results && (
            <Card>
              <CardHeader>
                <CardTitle>Query Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg">
                  <ScrollArea className="h-[400px]">
                    <Table>
                      <TableHeader className="sticky top-0 bg-background">
                        <TableRow>
                          {getResultColumns().map((column) => (
                            <TableHead key={column} className="font-medium">
                              {column}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {results.map((row, index) => (
                          <TableRow key={index}>
                            {getResultColumns().map((column) => (
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
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Available Tables */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Available Tables</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {tables.map((table) => (
                  <div key={table} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                    <span className="font-mono text-sm">{table}</span>
                    <Badge variant="outline" className="text-xs">
                      {entities[table]?.length || 0}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Sample Queries */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-sm">
                <BookOpenIcon className="w-4 h-4" />
                <span>Sample Queries</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {sampleQueries.map((sample, index) => (
                  <div key={index} className="p-3 border rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm">{sample.name}</h4>
                      <div className="flex space-x-1">
                        <Button variant="ghost" size="sm" onClick={() => copyQuery(sample.sql)}>
                          <CopyIcon className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => loadSampleQuery(sample)}>
                          Load
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">{sample.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Query Help */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-sm">
                <InfoIcon className="w-4 h-4" />
                <span>Query Tips</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-xs text-muted-foreground">
                <p>• Use standard SQL syntax</p>
                <p>• Table names are case-sensitive</p>
                <p>• Use SELECT * to get all columns</p>
                <p>• Use WHERE to filter results</p>
                <p>• Use COUNT(*) for counting records</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
