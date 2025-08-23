"use client"

import { useState, useEffect } from "react"
import { FileUploadZone } from "@/components/file-upload-zone"
import { ProcessingStatus } from "@/components/processing-status"
import { DatabaseViewer } from "@/components/database-viewer"
import { Header } from "@/components/header"
import { usePyodide } from "@/hooks/use-pyodide"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  ShieldIcon,
  EyeIcon,
  ExternalLinkIcon,
  HeartIcon,
  DatabaseIcon,
  CodeIcon,
  GlobeIcon
} from "lucide-react"
import type { ProcessingResult } from "@/lib/pyodide-worker"

export default function IFCDataBrowser() {
  const [currentView, setCurrentView] = useState<"upload" | "processing" | "database">("upload")
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [databaseData, setDatabaseData] = useState<ProcessingResult | null>(null)

  const usePyodideHook = usePyodide()
  const { status, isInitialized, initializePyodide, processIfcFile, cleanup } = usePyodideHook

  // Initialize Pyodide on component mount
  useEffect(() => {
    console.log("[v0] Component mounted, initializing Pyodide")
    initializePyodide().catch(console.error)

    return () => {
      console.log("[v0] Component unmounting, cleaning up")
      cleanup()
    }
  }, []) // Removed dependencies to prevent re-initialization

  const handleFileUpload = async (file: File) => {
    if (!isInitialized) {
      console.error("Pyodide not initialized")
      return
    }

    setUploadedFile(file)
    setCurrentView("processing")

    try {
      const result = await processIfcFile(file)
      setDatabaseData(result)
      setCurrentView("database")
    } catch (error) {
      console.error("Processing failed:", error)
      setCurrentView("upload")
    }
  }

  const handleBackToUpload = () => {
    setCurrentView("upload")
    setUploadedFile(null)
    setDatabaseData(null)
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="min-h-screen">
        {currentView === "upload" && (
          <>
            {/* Hero Section */}
            <div className="bg-gradient-to-br from-primary/5 via-background to-secondary/5 border-b">
              <div className="container mx-auto px-4 py-12">
                <div className="text-center max-w-4xl mx-auto">
                  <h1 className="font-inter text-5xl md:text-6xl font-bold text-foreground mb-6">
                    IFC Data Browser
                  </h1>
                  <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                    Transform IFC building models into interactive SQL databases directly in your browser
                  </p>
                  {!isInitialized && (
                    <p className="text-sm text-muted-foreground">Initializing WebAssembly runtime...</p>
                  )}
                </div>
              </div>
            </div>

            {/* Main Content Grid */}
            <div className="container mx-auto px-4 py-12">
              <div className="grid lg:grid-cols-3 gap-8 max-w-7xl mx-auto">

                {/* Left Column - Upload & Quick Info */}
                <div className="lg:col-span-2 space-y-8">
                  <FileUploadZone onFileUpload={handleFileUpload} disabled={!isInitialized} />

                  {/* About This Tool - Compact */}
                  <Card className="bg-muted/30">
                    <CardContent className="p-6">
                      <h3 className="font-inter font-semibold text-foreground mb-3 flex items-center gap-2">
                        <DatabaseIcon className="w-4 h-4" />
                        About IFCsql
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Professional IFC analysis tool for architects and engineers. Convert complex building models
                        into queryable databases without desktop software.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className="text-xs">IFC2X3</Badge>
                        <Badge variant="outline" className="text-xs">IFC4</Badge>
                        <Badge variant="outline" className="text-xs">IFC4X3</Badge>
                        <Badge variant="outline" className="text-xs">WebAssembly</Badge>
                        <Badge variant="outline" className="text-xs">Open Source</Badge>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Right Column - Key Information Cards */}
                <div className="space-y-6">
                  {/* Privacy & Security - Most Important */}
                  <Card className="bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-green-800 dark:text-green-200 text-sm">
                        <ShieldIcon className="w-4 h-4" />
                        Privacy First
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-xs text-green-700 dark:text-green-300 mb-3">
                        <strong>100% client-side processing.</strong> Your IFC data never leaves your device.
                      </p>
                      <div className="space-y-1 text-xs text-green-600 dark:text-green-400">
                        <div className="flex items-center gap-1">
                          <DatabaseIcon className="w-3 h-3" />
                          <span>No external servers</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <CodeIcon className="w-3 h-3" />
                          <span>WebAssembly powered</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* How to Verify - Quick */}
                  <Card className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-blue-800 dark:text-blue-200 text-sm">
                        <EyeIcon className="w-4 h-4" />
                        Verify Security
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-xs text-blue-700 dark:text-blue-300 mb-2">
                        Check browser dev tools:
                      </p>
                      <div className="space-y-1 text-xs text-blue-600 dark:text-blue-400">
                        <div>• Press <code className="bg-blue-100 dark:bg-blue-900 px-1 py-0.5 rounded text-xs">F12</code></div>
                        <div>• Network tab shows <code className="bg-blue-100 dark:bg-blue-900 px-1 py-0.5 rounded text-xs">0 B</code> uploaded</div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Credits - Compact */}
                  <Card className="bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-200 text-sm">
                        <HeartIcon className="w-4 h-4" />
                        Built With
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-amber-600 dark:text-amber-400">IfcOpenShell</span>
                          <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 text-xs px-1 py-0">
                            Core
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-amber-600 dark:text-amber-400">Pyodide</span>
                          <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 text-xs px-1 py-0">
                            WASM
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-amber-600 dark:text-amber-400">Next.js</span>
                          <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 text-xs px-1 py-0">
                            UI
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Resources - Footer style */}
                  <div className="pt-4 border-t">
                    <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                      <ExternalLinkIcon className="w-4 h-4" />
                      Resources
                    </h4>
                    <div className="space-y-2 text-xs">
                      <a
                        href="https://ifcopenshell.org/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-muted-foreground hover:text-foreground transition-colors"
                      >
                        IfcOpenShell Docs
                      </a>
                      <a
                        href="https://standards.buildingsmart.org/IFC/RELEASE/IFC4_3/HTML/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-muted-foreground hover:text-foreground transition-colors"
                      >
                        IFC Standards
                      </a>
                      <a
                        href="https://github.com/IfcOpenShell/IfcOpenShell"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-muted-foreground hover:text-foreground transition-colors"
                      >
                        GitHub Source
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {currentView === "processing" && (
          <ProcessingStatus
            fileName={uploadedFile?.name || ""}
            onCancel={handleBackToUpload}
            progress={status.progress}
            currentStep={status.currentStep}
            error={status.error}
          />
        )}

        {currentView === "database" && databaseData && (
          <DatabaseViewer data={databaseData} onBackToUpload={handleBackToUpload} fileName={uploadedFile?.name} usePyodide={usePyodideHook} />
        )}
      </main>
    </div>
  )
}
