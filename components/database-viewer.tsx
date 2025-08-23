"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ArrowLeftIcon,
  DatabaseIcon,
  TableIcon,
  InfoIcon,
  ChevronRightIcon,
  HashIcon,
  SettingsIcon,
} from "lucide-react"
import type { ProcessingResult } from "@/lib/pyodide-worker"
import { DataTable } from "@/components/data-table"
import { QueryInterface } from "@/components/query-interface"
import { DataManagement } from "@/components/data-management"

interface DatabaseViewerProps {
  data: ProcessingResult
  onBackToUpload: () => void
  fileName?: string
}

export function DatabaseViewer({ data, onBackToUpload, fileName = "unknown.ifc" }: DatabaseViewerProps) {
  const [selectedTable, setSelectedTable] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("overview")

  const handleTableSelect = (tableName: string) => {
    setSelectedTable(tableName)
    setActiveTab("table")
  }

  const handleBackToOverview = () => {
    setSelectedTable(null)
    setActiveTab("overview")
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={onBackToUpload}>
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to Upload
          </Button>
          <div className="flex items-center space-x-2">
            <DatabaseIcon className="w-5 h-5 text-primary" />
            <h1 className="font-serif text-2xl font-bold text-foreground">Database Viewer</h1>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="secondary" className="bg-primary/10 text-primary">
            {data.schema}
          </Badge>
          <Badge variant="outline">{data.totalEntities} entities</Badge>
        </div>
      </div>

      {/* Navigation breadcrumb */}
      {selectedTable && (
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <button onClick={handleBackToOverview} className="hover:text-foreground transition-colors">
            Database Overview
          </button>
          <ChevronRightIcon className="w-4 h-4" />
          <span className="text-foreground font-medium">{selectedTable}</span>
        </div>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="table" disabled={!selectedTable}>
            {selectedTable ? `Table: ${selectedTable}` : "Select Table"}
          </TabsTrigger>
          <TabsTrigger value="query">Query</TabsTrigger>
          <TabsTrigger value="manage">
            <SettingsIcon className="w-4 h-4 mr-2" />
            Manage
          </TabsTrigger>
        </TabsList>

        {/* Database Overview */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Statistics Cards */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Tables</CardTitle>
                <TableIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">{data.tables.length}</div>
                <p className="text-xs text-muted-foreground">IFC entity types</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Entities</CardTitle>
                <HashIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">{data.totalEntities}</div>
                <p className="text-xs text-muted-foreground">Building elements</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Schema Version</CardTitle>
                <InfoIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">{data.schema}</div>
                <p className="text-xs text-muted-foreground">IFC standard</p>
              </CardContent>
            </Card>
          </div>

          {/* Tables List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TableIcon className="w-5 h-5" />
                <span>Available Tables</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {data.tables.map((tableName) => {
                  const tableData = data.entities[tableName] || []
                  return (
                    <Card
                      key={tableName}
                      className="cursor-pointer hover:bg-muted/50 transition-colors border-2 hover:border-primary/20"
                      onClick={() => handleTableSelect(tableName)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium text-foreground">{tableName}</h3>
                            <p className="text-sm text-muted-foreground">
                              {tableData.length} {tableData.length === 1 ? "record" : "records"}
                            </p>
                          </div>
                          <ChevronRightIcon className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Schema Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <InfoIcon className="w-5 h-5" />
                <span>Schema Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-foreground mb-2">IFC Schema</h4>
                  <p className="text-sm text-muted-foreground">
                    This database follows the {data.schema} schema specification, which defines the structure and
                    relationships between building information elements.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-foreground mb-2">Entity Types</h4>
                  <div className="flex flex-wrap gap-1">
                    {data.tables.slice(0, 6).map((table) => (
                      <Badge key={table} variant="outline" className="text-xs">
                        {table}
                      </Badge>
                    ))}
                    {data.tables.length > 6 && (
                      <Badge variant="outline" className="text-xs">
                        +{data.tables.length - 6} more
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Table View */}
        <TabsContent value="table" className="space-y-6">
          {selectedTable && (
            <DataTable
              tableName={selectedTable}
              data={data.entities[selectedTable] || []}
              onBack={handleBackToOverview}
            />
          )}
        </TabsContent>

        {/* Query Interface */}
        <TabsContent value="query" className="space-y-6">
          <QueryInterface tables={data.tables} entities={data.entities} />
        </TabsContent>

        {/* Data Management */}
        <TabsContent value="manage" className="space-y-6">
          <DataManagement data={data} fileName={fileName} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
