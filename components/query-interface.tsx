"use client"

import { useState, useRef } from "react"
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
        name: "Database Overview",
        description: "Get a quick overview of your IFC database",
        sql: "SELECT 'Total Properties' as Metric, COUNT(*) as Count FROM psets\nUNION ALL\nSELECT 'Unique Elements' as Metric, COUNT(DISTINCT ifc_id) as Count FROM psets\nUNION ALL\nSELECT 'IFC Classes' as Metric, COUNT(DISTINCT ifc_class) as Count FROM id_map\nUNION ALL\nSELECT 'Property Sets' as Metric, COUNT(DISTINCT pset_name) as Count FROM psets;",
        icon: DatabaseIcon,
      },
      {
        name: "All Properties Sample",
        description: "View a sample of all property data available",
        sql: "SELECT * FROM psets LIMIT 10;",
        icon: DatabaseIcon,
      },
      {
        name: "IFC Classes in File",
        description: "See what IFC element types are in your file",
        sql: "SELECT \n  ifc_class as IFC_Type,\n  COUNT(*) as Count\nFROM id_map\nGROUP BY ifc_class\nORDER BY Count DESC;",
        icon: InfoIcon,
      },
      {
        name: "Most Common IFC Classes",
        description: "Show the top IFC element types in your file",
        sql: "SELECT \n  ifc_class as IFC_Type,\n  COUNT(*) as Count\nFROM id_map\nGROUP BY ifc_class\nORDER BY Count DESC\nLIMIT 10;",
        icon: InfoIcon,
      },
      {
        name: "Building Elements Only",
        description: "Show only physical building elements (walls, doors, etc.)",
        sql: "SELECT \n  ifc_class as IFC_Type,\n  COUNT(*) as Count\nFROM id_map\nWHERE ifc_class LIKE '%Wall%' OR ifc_class LIKE '%Door%' OR ifc_class LIKE '%Window%'\n   OR ifc_class LIKE '%Slab%' OR ifc_class LIKE '%Beam%' OR ifc_class LIKE '%Column%'\n   OR ifc_class LIKE '%Roof%' OR ifc_class LIKE '%Floor%'\nGROUP BY ifc_class\nORDER BY Count DESC;",
        icon: InfoIcon,
      },
      {
        name: "Any Non-Empty Properties",
        description: "Find any properties with values (to understand data structure)",
        sql: "SELECT \n  p.name as Property_Name,\n  p.value as Sample_Value,\n  COUNT(*) as Total_Count\nFROM psets p\nWHERE p.value IS NOT NULL AND p.value != '' AND LENGTH(p.value) > 0\nGROUP BY p.name, p.value\nORDER BY Total_Count DESC\nLIMIT 15;",
        icon: InfoIcon,
      },
      {
        name: "All Property Names (Raw)",
        description: "See ALL property names in your file (no filtering)",
        sql: "SELECT \n  name as Property_Name,\n  COUNT(*) as Count\nFROM psets\nGROUP BY name\nORDER BY Count DESC\nLIMIT 50;",
        icon: InfoIcon,
      },
      {
        name: "Properties With Values",
        description: "Show properties that actually have values",
        sql: "SELECT \n  name as Property_Name,\n  value as Property_Value\nFROM psets\nWHERE value IS NOT NULL AND value != ''\nLIMIT 20;",
        icon: InfoIcon,
      },
      {
        name: "Property Value Statistics",
        description: "Show how complete your property data is",
        sql: "SELECT\n  'Total Properties' as Metric, COUNT(*) as Count FROM psets\nUNION ALL\nSELECT 'Properties with Values' as Metric, COUNT(*) as Count FROM psets WHERE value IS NOT NULL AND value != ''\nUNION ALL\nSELECT 'Empty Properties' as Metric, COUNT(*) as Count FROM psets WHERE value IS NULL OR value = ''\nUNION ALL\nSELECT 'Data Completeness %' as Metric, ROUND((COUNT(CASE WHEN value IS NOT NULL AND value != '' THEN 1 END) * 100.0 / COUNT(*)), 1) as Count FROM psets;",
        icon: InfoIcon,
      },
      {
        name: "Properties Without Values",
        description: "Show properties that are NULL or empty (if any)",
        sql: "SELECT \n  name as Property_Name,\n  COUNT(*) as Count\nFROM psets\nWHERE value IS NULL OR value = ''\nGROUP BY name\nORDER BY Count DESC\nLIMIT 20;",
        icon: InfoIcon,
      },
      {
        name: "Most Common Property Values",
        description: "Show the most frequently occurring property values",
        sql: "SELECT \n  name as Property_Name,\n  value as Property_Value,\n  COUNT(*) as Occurrences\nFROM psets\nWHERE value IS NOT NULL AND value != ''\nGROUP BY name, value\nORDER BY Occurrences DESC\nLIMIT 20;",
        icon: InfoIcon,
      },
      {
        name: "Any Walls in File?",
        description: "Check if there are any wall elements in your IFC file",
        sql: "SELECT \n  ifc_class as IFC_Type,\n  COUNT(*) as Count\nFROM id_map\nWHERE ifc_class LIKE '%Wall%'\nGROUP BY ifc_class;",
        icon: InfoIcon,
      },
      {
        name: "Wall Properties (Simple)",
        description: "Show all properties for wall elements (if any exist)",
        sql: "SELECT \n  id.ifc_class as IFC_Type,\n  p.name as Property_Name,\n  p.value as Property_Value\nFROM psets p\nJOIN id_map id ON p.ifc_id = id.ifc_id\nWHERE id.ifc_class LIKE '%Wall%'\nLIMIT 50;",
        icon: InfoIcon,
      },
      {
        name: "Walls Overview",
        description: "Get wall information with available properties",
        sql: "SELECT DISTINCT\n  p1.ifc_id as Element_ID,\n  COALESCE(p1.value, 'No Description') as Name,\n  id.ifc_class as ObjectType,\n  p2.value as LoadBearing,\n  p3.value as IsExternal,\n  p4.value as Height,\n  p5.value as Length,\n  p6.value as Width\nFROM psets p1\nJOIN id_map id ON p1.ifc_id = id.ifc_id\nLEFT JOIN psets p2 ON p1.ifc_id = p2.ifc_id AND p2.name = 'LoadBearing'\nLEFT JOIN psets p3 ON p1.ifc_id = p3.ifc_id AND p3.name = 'IsExternal'\nLEFT JOIN psets p4 ON p1.ifc_id = p4.ifc_id AND p4.name = 'Height'\nLEFT JOIN psets p5 ON p1.ifc_id = p5.ifc_id AND p5.name = 'Length'\nLEFT JOIN psets p6 ON p1.ifc_id = p6.ifc_id AND p6.name = 'Width'\nWHERE id.ifc_class LIKE '%Wall%'\nAND (p1.name = 'Description' OR p1.name = 'Reference')\nLIMIT 50;",
        icon: BuildingIcon,
      },
      {
        name: "Building Hierarchy",
        description: "Show the building structure hierarchy from available data",
        sql: "SELECT\n  CASE\n    WHEN id.ifc_class LIKE '%Project%' THEN 'Project'\n    WHEN id.ifc_class LIKE '%Site%' THEN 'Site'\n    WHEN id.ifc_class LIKE '%Building%' AND id.ifc_class NOT LIKE '%Storey%' THEN 'Building'\n    WHEN id.ifc_class LIKE '%Storey%' THEN 'Storey'\n    ELSE 'Other'\n  END as Level,\n  p.value as Name,\n  id.ifc_class as Type\nFROM psets p\nJOIN id_map id ON p.ifc_id = id.ifc_id\nWHERE (p.name = 'Name' OR p.name = 'Description' OR p.name = 'Reference')\n  AND p.value IS NOT NULL AND p.value != ''\nORDER BY\n  CASE\n    WHEN id.ifc_class LIKE '%Project%' THEN 1\n    WHEN id.ifc_class LIKE '%Site%' THEN 2\n    WHEN id.ifc_class LIKE '%Building%' AND id.ifc_class NOT LIKE '%Storey%' THEN 3\n    WHEN id.ifc_class LIKE '%Storey%' THEN 4\n    ELSE 5\n  END;",
        icon: LayersIcon,
      },
    ],
  },
  {
    category: "Analytics & Insights",
    queries: [
      {
        name: "Element Count Analysis",
        description: "Count of all building elements by IFC class type",
        sql: "SELECT\n  id.ifc_class as Element_Type,\n  COUNT(DISTINCT p.ifc_id) as Count,\n  CASE\n    WHEN id.ifc_class LIKE '%Wall%' THEN 'Structural'\n    WHEN id.ifc_class LIKE '%Slab%' THEN 'Structural'\n    WHEN id.ifc_class LIKE '%Beam%' THEN 'Structural'\n    WHEN id.ifc_class LIKE '%Column%' THEN 'Structural'\n    WHEN id.ifc_class LIKE '%Door%' THEN 'Opening'\n    WHEN id.ifc_class LIKE '%Window%' THEN 'Opening'\n    ELSE 'Other'\n  END as Category\nFROM psets p\nJOIN id_map id ON p.ifc_id = id.ifc_id\nGROUP BY id.ifc_class\nORDER BY Count DESC\nLIMIT 20;",
        icon: TrendingUpIcon,
      },
      {
        name: "Material Usage Summary",
        description: "Top materials and property values used across the building model",
        sql: "SELECT \n  name as Property_Name,\n  value as Property_Value,\n  COUNT(*) as Usage_Count\nFROM psets\nWHERE value IS NOT NULL AND value != ''\nAND (name LIKE '%Material%' OR name LIKE '%material%' OR name LIKE '%Mat%' OR name LIKE '%mat%'\n     OR name LIKE '%Type%' OR name LIKE '%type%' OR name LIKE '%Category%' OR name LIKE '%category%'\n     OR name LIKE '%Layer%' OR name LIKE '%layer%')\nGROUP BY name, value\nORDER BY Usage_Count DESC\nLIMIT 20;",
        icon: SparklesIcon,
      },
    ],
  },
  {
    category: "Property Analysis",
    queries: [
      {
        name: "Available Property Names",
        description: "See all available property names in the model",
        sql: "SELECT \n  p.name as Property_Name,\n  COUNT(*) as Count,\n  COUNT(DISTINCT p.pset_name) as Property_Sets,\n  COUNT(DISTINCT id.ifc_class) as IFC_Types\nFROM psets p\nJOIN id_map id ON p.ifc_id = id.ifc_id\nWHERE p.name IS NOT NULL AND p.name != ''\nGROUP BY p.name\nORDER BY Count DESC\nLIMIT 30;",
        icon: SearchIcon,
      },
      {
        name: "Search for Material Properties",
        description: "Find any properties containing 'material' (case-insensitive)",
        sql: "SELECT \n  p.name as Property_Name,\n  p.value as Property_Value,\n  COUNT(*) as Occurrences\nFROM psets p\nWHERE LOWER(p.name) LIKE '%material%'\nAND p.value IS NOT NULL AND p.value != ''\nGROUP BY p.name, p.value\nORDER BY Occurrences DESC\nLIMIT 20;",
        icon: InfoIcon,
      },
      {
        name: "Property Name Patterns",
        description: "Find property names with common patterns",
        sql: "SELECT \n  p.name as Property_Name,\n  COUNT(*) as Count\nFROM psets p\nWHERE p.name IS NOT NULL AND p.name != ''\n  AND (LOWER(p.name) LIKE '%type%' OR LOWER(p.name) LIKE '%category%' OR LOWER(p.name) LIKE '%layer%' OR LOWER(p.name) LIKE '%class%')\nGROUP BY p.name\nORDER BY Count DESC\nLIMIT 25;",
        icon: InfoIcon,
      },
      {
        name: "Sample Properties",
        description: "View a sample of actual property data",
        sql: "SELECT \n  p.ifc_id as Element_ID,\n  id.ifc_class as IFC_Type,\n  p.pset_name as Property_Set,\n  p.name as Property_Name,\n  p.value as Property_Value\nFROM psets p\nJOIN id_map id ON p.ifc_id = id.ifc_id\nWHERE p.value IS NOT NULL AND p.value != ''\nLIMIT 20;",
        icon: InfoIcon,
      },
      {
        name: "Property Set Overview",
        description: "Most common property sets and their usage",
        sql: "SELECT \n  p.pset_name as Property_Set,\n  COUNT(DISTINCT p.ifc_id) as Elements_Count,\n  COUNT(*) as Properties_Count,\n  COUNT(DISTINCT id.ifc_class) as IFC_Types\nFROM psets p\nJOIN id_map id ON p.ifc_id = id.ifc_id\nGROUP BY p.pset_name\nORDER BY Elements_Count DESC\nLIMIT 15;",
        icon: InfoIcon,
      },
      {
        name: "Fire Rating Properties",
        description: "Find elements with fire rating information",
        sql: "SELECT \n  p.ifc_id as Element_ID,\n  id.ifc_class as IFC_Type,\n  p.pset_name as Property_Set,\n  p.name as Property_Name,\n  p.value as Fire_Rating\nFROM psets p\nJOIN id_map id ON p.ifc_id = id.ifc_id\nWHERE p.name LIKE '%Fire%' OR p.name LIKE '%Rating%' OR p.name LIKE '%fire%' OR p.name LIKE '%rating%'\nLIMIT 30;",
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
        sql: "SELECT \n  p.ifc_id as Element_ID,\n  id.ifc_class as IFC_Type,\n  p.name as Dimension_Type,\n  p.value as Value\nFROM psets p\nJOIN id_map id ON p.ifc_id = id.ifc_id\nWHERE (p.name LIKE '%Length%' OR p.name LIKE '%Width%' OR p.name LIKE '%Height%' OR p.name LIKE '%Area%' OR p.name LIKE '%Volume%' OR p.name LIKE '%length%' OR p.name LIKE '%width%' OR p.name LIKE '%height%' OR p.name LIKE '%area%' OR p.name LIKE '%volume%')\nAND p.value IS NOT NULL AND p.value != '' AND p.value != '0'\nORDER BY CAST(p.value AS REAL) DESC\nLIMIT 50;",
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

  // Ref for the query editor textarea to enable smooth scrolling
  const queryEditorRef = useRef<HTMLTextAreaElement>(null)

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

      if (!usePyodide.executeQuery) {
        throw new Error("Query execution not available")
      }

      const queryResults = await usePyodide.executeQuery(query.trim())
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

    // Smooth scroll to the query editor
    if (queryEditorRef.current) {
      queryEditorRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      })

      // Focus the textarea for better UX
      setTimeout(() => {
        queryEditorRef.current?.focus()
      }, 500) // Small delay to let scroll animation complete
    }
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
                  ref={queryEditorRef}
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
