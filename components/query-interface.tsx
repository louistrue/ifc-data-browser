"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  PlayIcon,
  DatabaseIcon,
  InfoIcon,
  BookOpenIcon,
  CopyIcon,
  ChevronDownIcon,
  SparklesIcon,
  TrendingUpIcon,
  BuildingIcon,
  LayersIcon,
  SearchIcon,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface QueryInterfaceProps {
  tables: string[]
  entities: Record<string, any[]>
  specialTables: any
  psetStats: any
  usePyodide: any
}

const sampleQueries = [
  {
    category: "Basic Queries",
    queries: [
      {
        name: "All Walls Overview",
        description: "Get essential wall information with load bearing status",
        sql: "SELECT GlobalId, Name, ObjectType, is_loadbearing, is_external FROM IfcWall LIMIT 50;",
        icon: BuildingIcon,
      },
      {
        name: "Building Hierarchy",
        description: "Show the complete building structure hierarchy",
        sql: "SELECT 'Project' as Level, Name, Description FROM IfcProject\nUNION ALL\nSELECT 'Site' as Level, Name, Description FROM IfcSite\nUNION ALL\nSELECT 'Building' as Level, Name, Description FROM IfcBuilding\nUNION ALL\nSELECT 'Storey' as Level, Name, Description FROM IfcBuildingStorey;",
        icon: LayersIcon,
      },
    ],
  },
  {
    category: "Analytics & Insights",
    queries: [
      {
        name: "Element Count Analysis",
        description: "Comprehensive count of all building elements by type",
        sql: "SELECT 'Walls' as Element_Type, COUNT(*) as Count, 'Structural' as Category FROM IfcWall\nUNION ALL\nSELECT 'Doors' as Element_Type, COUNT(*) as Count, 'Opening' as Category FROM IfcDoor\nUNION ALL\nSELECT 'Windows' as Element_Type, COUNT(*) as Count, 'Opening' as Category FROM IfcWindow\nUNION ALL\nSELECT 'Slabs' as Element_Type, COUNT(*) as Count, 'Structural' as Category FROM IfcSlab\nORDER BY Count DESC;",
        icon: TrendingUpIcon,
      },
      {
        name: "Material Usage Summary",
        description: "Top materials used across the building model",
        sql: "SELECT \n  Name as Material_Name,\n  Description,\n  COUNT(*) as Usage_Count\nFROM materials\nWHERE Name IS NOT NULL\nGROUP BY Name, Description\nORDER BY Usage_Count DESC\nLIMIT 20;",
        icon: SparklesIcon,
      },
    ],
  },
  {
    category: "Property Analysis",
    queries: [
      {
        name: "Property Set Overview",
        description: "Most common property sets and their usage",
        sql: "SELECT \n  pset_name as Property_Set,\n  COUNT(DISTINCT entity_id) as Elements_Count,\n  COUNT(*) as Properties_Count\nFROM properties\nGROUP BY pset_name\nORDER BY Elements_Count DESC\nLIMIT 15;",
        icon: SearchIcon,
      },
      {
        name: "Fire Rating Properties",
        description: "Find elements with fire rating information",
        sql: "SELECT \n  entity_name as Element,\n  pset_name as Property_Set,\n  property_name as Property,\n  property_value as Fire_Rating\nFROM properties\nWHERE property_name LIKE '%Fire%' OR property_name LIKE '%Rating%'\nLIMIT 30;",
        icon: InfoIcon,
      },
    ],
  },
  {
    category: "Quantity Analysis",
    queries: [
      {
        name: "Element Dimensions",
        description: "Dimensional analysis of building elements",
        sql: "SELECT \n  entity_name as Element,\n  property_name as Dimension_Type,\n  property_value as Value,\n  unit as Unit\nFROM quantities\nWHERE property_value IS NOT NULL AND property_value > 0\nORDER BY property_value DESC\nLIMIT 50;",
        icon: TrendingUpIcon,
      },
    ],
  },
]

export function QueryInterface({ tables, entities, specialTables, psetStats, usePyodide }: QueryInterfaceProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<any[] | null>(null)
  const [isExecuting, setIsExecuting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isTablesOpen, setIsTablesOpen] = useState(false)
  const { toast } = useToast()

  const executeQuery = async () => {
    if (!query.trim()) return

    console.log("[v0] Executing SQL query:", query)
    setIsExecuting(true)
    setError(null)
    setResults(null)

    try {
      if (!usePyodide.isInitialized) {
        throw new Error("Pyodide not initialized. Please process an IFC file first.")
      }

      const worker = usePyodide.workerRef?.current
      if (!worker) {
        throw new Error("No active Pyodide worker available")
      }

      const queryPromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Query execution timeout"))
        }, 30000) // 30 second timeout

        const originalOnMessage = worker.onmessage

        worker.onmessage = (event) => {
          const { type, data } = event.data

          console.log("[v0] Query worker response:", { type, data })

          if (type === "query_result") {
            clearTimeout(timeout)
            worker.onmessage = originalOnMessage
            resolve(data)
          } else if (type === "error") {
            clearTimeout(timeout)
            worker.onmessage = originalOnMessage
            reject(new Error(data.message || "Query execution failed"))
          } else if (originalOnMessage) {
            originalOnMessage(event)
          }
        }

        worker.onerror = (error) => {
          clearTimeout(timeout)
          console.error("[v0] Query worker error:", error)
          worker.onmessage = originalOnMessage
          reject(new Error("Worker execution failed"))
        }

        worker.postMessage({
          type: "execute_query",
          data: { query: query.trim() },
        })
      })

      const queryResults = await queryPromise
      console.log("[v0] Query results received:", queryResults)

      setResults(Array.isArray(queryResults) ? queryResults : [])

      toast({
        title: "Query executed successfully",
        description: `Returned ${Array.isArray(queryResults) ? queryResults.length : 0} rows`,
      })
    } catch (err) {
      console.error("[v0] Query execution error:", err)
      setError(err instanceof Error ? err.message : "Failed to execute query. Please check your SQL syntax.")
      toast({
        title: "Query failed",
        description: "Please check your SQL syntax and try again",
        variant: "destructive",
      })
    } finally {
      setIsExecuting(false)
    }
  }

  const loadSampleQuery = (sampleQuery: any) => {
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
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="xl:col-span-3 space-y-6">
          {/* Query Editor */}
          <Card className="shadow-lg">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b">
              <CardTitle className="flex items-center space-x-2">
                <DatabaseIcon className="w-5 h-5 text-slate-700" />
                <span>Advanced SQL Query Editor</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <Textarea
                  placeholder="-- Enter your SQL query here
-- Example: SELECT * FROM IfcWall WHERE is_loadbearing = 'Yes' LIMIT 10;"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="min-h-[250px] font-mono text-sm bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                />
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Button
                      onClick={executeQuery}
                      disabled={!query.trim() || isExecuting}
                      className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                    >
                      <PlayIcon className="w-4 h-4 mr-2" />
                      {isExecuting ? "Executing..." : "Execute Query"}
                    </Button>
                    {results && (
                      <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
                        ✓ {results.length} rows returned
                      </Badge>
                    )}
                  </div>
                </div>
                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700 font-medium">{error}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Query Results */}
          {results && (
            <Card className="shadow-lg">
              <CardHeader className="bg-gradient-to-r from-green-50 to-green-100 border-b">
                <CardTitle className="flex items-center justify-between">
                  <span>Query Results</span>
                  <Badge variant="outline" className="bg-white">
                    {results.length} rows × {getResultColumns().length} columns
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="border-t">
                  <ScrollArea className="h-[500px]">
                    <Table>
                      <TableHeader className="sticky top-0 bg-white border-b-2">
                        <TableRow>
                          {getResultColumns().map((column) => (
                            <TableHead key={column} className="font-semibold bg-slate-50 border-r last:border-r-0">
                              {column}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {results.map((row, index) => (
                          <TableRow key={index} className="hover:bg-slate-50">
                            {getResultColumns().map((column) => (
                              <TableCell key={column} className="font-mono text-sm border-r last:border-r-0">
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

        <div className="xl:col-span-1 space-y-4">
          {/* Collapsible Available Tables */}
          <Card className="shadow-md">
            <Collapsible open={isTablesOpen} onOpenChange={setIsTablesOpen}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-slate-50 transition-colors pb-3">
                  <CardTitle className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2">
                      <DatabaseIcon className="w-4 h-4" />
                      <span>Tables ({tables.length})</span>
                    </div>
                    <ChevronDownIcon className={`w-4 h-4 transition-transform ${isTablesOpen ? "rotate-180" : ""}`} />
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-1">
                      {tables.map((table) => (
                        <div
                          key={table}
                          className="flex items-center justify-between p-2 bg-slate-50 rounded text-xs hover:bg-slate-100 transition-colors"
                        >
                          <span className="font-mono truncate">{table}</span>
                          <Badge variant="outline" className="text-xs ml-2 flex-shrink-0">
                            {entities[table]?.length || 0}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>

          <Card className="shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2 text-sm">
                <BookOpenIcon className="w-4 h-4" />
                <span>Query Templates</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ScrollArea className="h-[600px]">
                <div className="space-y-4">
                  {sampleQueries.map((category, categoryIndex) => (
                    <div key={categoryIndex} className="space-y-2">
                      <h4 className="font-semibold text-xs text-slate-600 uppercase tracking-wide border-b pb-1">
                        {category.category}
                      </h4>
                      <div className="space-y-2">
                        {category.queries.map((sample, index) => {
                          const IconComponent = sample.icon
                          return (
                            <div
                              key={index}
                              className="p-3 border rounded-lg hover:bg-slate-50 transition-colors group"
                            >
                              <div className="flex items-start space-x-2 mb-2">
                                <IconComponent className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <h5 className="font-medium text-sm text-slate-900 truncate">{sample.name}</h5>
                                  <p className="text-xs text-slate-600 mt-1 line-clamp-2">{sample.description}</p>
                                </div>
                              </div>
                              <div className="flex space-x-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyQuery(sample.sql)}
                                  className="h-7 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <CopyIcon className="w-3 h-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => loadSampleQuery(sample)}
                                  className="h-7 px-2 text-xs bg-blue-50 text-blue-700 hover:bg-blue-100"
                                >
                                  Use Template
                                </Button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
