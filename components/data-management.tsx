"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DownloadIcon,
  SaveIcon,
  ShareIcon,
  HistoryIcon,
  BookmarkIcon,
  TrashIcon,
  FileTextIcon,
  DatabaseIcon,
  ClockIcon,
} from "lucide-react"
import type { ProcessingResult } from "@/lib/pyodide-worker"
import { useToast } from "@/hooks/use-toast"

interface DataManagementProps {
  data: ProcessingResult
  fileName: string
}

interface SavedProject {
  id: string
  name: string
  fileName: string
  schema: string
  totalEntities: number
  savedAt: Date
  size: string
}

interface QueryHistory {
  id: string
  query: string
  executedAt: Date
  resultCount: number
}

export function DataManagement({ data, fileName }: DataManagementProps) {
  const [projectName, setProjectName] = useState(fileName.replace(".ifc", ""))
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([
    {
      id: "1",
      name: "Office Building Model",
      fileName: "office_building.ifc",
      schema: "IFC4",
      totalEntities: 2341,
      savedAt: new Date("2024-01-15"),
      size: "15.2 MB",
    },
    {
      id: "2",
      name: "Residential Complex",
      fileName: "residential.ifc",
      schema: "IFC4",
      totalEntities: 1876,
      savedAt: new Date("2024-01-10"),
      size: "12.8 MB",
    },
  ])

  const [queryHistory, setQueryHistory] = useState<QueryHistory[]>([
    {
      id: "1",
      query: "SELECT * FROM IfcWall WHERE Name IS NOT NULL",
      executedAt: new Date("2024-01-16T10:30:00"),
      resultCount: 45,
    },
    {
      id: "2",
      query: "SELECT COUNT(*) FROM IfcDoor",
      executedAt: new Date("2024-01-16T10:25:00"),
      resultCount: 1,
    },
  ])

  const { toast } = useToast()

  const handleSaveProject = () => {
    const newProject: SavedProject = {
      id: Date.now().toString(),
      name: projectName,
      fileName: fileName,
      schema: data.schema,
      totalEntities: data.totalEntities,
      savedAt: new Date(),
      size: "8.5 MB", // Mock size
    }

    setSavedProjects((prev) => [newProject, ...prev])
    toast({
      title: "Project saved",
      description: `${projectName} has been saved successfully`,
    })
  }

  const handleExportDatabase = () => {
    // Mock database export
    const dbData = JSON.stringify(data, null, 2)
    const blob = new Blob([dbData], { type: "application/json" })
    const url = URL.createObjectURL(blob)

    const a = document.createElement("a")
    a.href = url
    a.download = `${projectName}_database.json`
    a.click()

    URL.revokeObjectURL(url)
    toast({
      title: "Database exported",
      description: "Database exported as JSON file",
    })
  }

  const handleExportSQL = () => {
    // Generate SQL dump
    let sqlDump = `-- IFC Database Export: ${projectName}\n-- Generated: ${new Date().toISOString()}\n-- Schema: ${data.schema}\n\n`

    data.tables.forEach((tableName) => {
      const tableData = data.entities[tableName] || []
      if (tableData.length === 0) return

      const columns = Object.keys(tableData[0])
      sqlDump += `-- Table: ${tableName}\n`
      sqlDump += `CREATE TABLE ${tableName} (\n`
      sqlDump += columns.map((col) => `  ${col} TEXT`).join(",\n")
      sqlDump += "\n);\n\n"

      tableData.forEach((row) => {
        const values = columns.map((col) => `'${String(row[col]).replace(/'/g, "''")}'`).join(", ")
        sqlDump += `INSERT INTO ${tableName} (${columns.join(", ")}) VALUES (${values});\n`
      })
      sqlDump += "\n"
    })

    const blob = new Blob([sqlDump], { type: "text/sql" })
    const url = URL.createObjectURL(blob)

    const a = document.createElement("a")
    a.href = url
    a.download = `${projectName}_database.sql`
    a.click()

    URL.revokeObjectURL(url)
    toast({
      title: "SQL export complete",
      description: "Database exported as SQL file",
    })
  }

  const handleShareProject = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `IFC Project: ${projectName}`,
          text: `Check out this IFC building data analysis with ${data.totalEntities} entities`,
          url: window.location.href,
        })
      } catch (err) {
        // Fallback to clipboard
        navigator.clipboard.writeText(window.location.href)
        toast({
          title: "Link copied",
          description: "Project link copied to clipboard",
        })
      }
    } else {
      navigator.clipboard.writeText(window.location.href)
      toast({
        title: "Link copied",
        description: "Project link copied to clipboard",
      })
    }
  }

  const handleDeleteProject = (projectId: string) => {
    setSavedProjects((prev) => prev.filter((p) => p.id !== projectId))
    toast({
      title: "Project deleted",
      description: "Project has been removed from saved projects",
    })
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="current" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="current">Current Project</TabsTrigger>
          <TabsTrigger value="saved">Saved Projects</TabsTrigger>
          <TabsTrigger value="history">Query History</TabsTrigger>
        </TabsList>

        {/* Current Project Management */}
        <TabsContent value="current" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <DatabaseIcon className="w-5 h-5" />
                <span>Project Management</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Project Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Project Name</label>
                    <Input
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      placeholder="Enter project name"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">Schema</label>
                      <Badge variant="secondary" className="bg-primary/10 text-primary">
                        {data.schema}
                      </Badge>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">Entities</label>
                      <Badge variant="outline">{data.totalEntities}</Badge>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Original File</label>
                    <div className="flex items-center space-x-2 p-2 bg-muted/50 rounded">
                      <FileTextIcon className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{fileName}</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Tables</label>
                    <div className="flex flex-wrap gap-1">
                      {data.tables.slice(0, 4).map((table) => (
                        <Badge key={table} variant="outline" className="text-xs">
                          {table}
                        </Badge>
                      ))}
                      {data.tables.length > 4 && (
                        <Badge variant="outline" className="text-xs">
                          +{data.tables.length - 4} more
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                <Button onClick={handleSaveProject}>
                  <SaveIcon className="w-4 h-4 mr-2" />
                  Save Project
                </Button>
                <Button variant="outline" onClick={handleExportDatabase}>
                  <DownloadIcon className="w-4 h-4 mr-2" />
                  Export JSON
                </Button>
                <Button variant="outline" onClick={handleExportSQL}>
                  <DatabaseIcon className="w-4 h-4 mr-2" />
                  Export SQL
                </Button>
                <Button variant="outline" onClick={handleShareProject}>
                  <ShareIcon className="w-4 h-4 mr-2" />
                  Share Project
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Saved Projects */}
        <TabsContent value="saved" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BookmarkIcon className="w-5 h-5" />
                <span>Saved Projects</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {savedProjects.map((project) => (
                  <Card key={project.id} className="border-2">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <h3 className="font-medium text-foreground">{project.name}</h3>
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            <span className="flex items-center space-x-1">
                              <FileTextIcon className="w-3 h-3" />
                              <span>{project.fileName}</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <ClockIcon className="w-3 h-3" />
                              <span>{formatDate(project.savedAt)}</span>
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant="secondary" className="text-xs">
                              {project.schema}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {project.totalEntities} entities
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {project.size}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm">
                            Load
                          </Button>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <TrashIcon className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Delete Project</DialogTitle>
                                <DialogDescription>
                                  Are you sure you want to delete "{project.name}"? This action cannot be undone.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="flex justify-end space-x-2">
                                <Button variant="outline">Cancel</Button>
                                <Button variant="destructive" onClick={() => handleDeleteProject(project.id)}>
                                  Delete
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Query History */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <HistoryIcon className="w-5 h-5" />
                <span>Query History</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {queryHistory.map((query) => (
                    <Card key={query.id} className="border">
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                              <ClockIcon className="w-3 h-3" />
                              <span>{formatDate(query.executedAt)}</span>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {query.resultCount} rows
                            </Badge>
                          </div>
                          <div className="bg-muted/50 p-3 rounded font-mono text-sm">{query.query}</div>
                          <div className="flex justify-end">
                            <Button variant="ghost" size="sm">
                              Run Again
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
