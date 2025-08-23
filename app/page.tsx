"use client"

import { useState, useEffect } from "react"
import { FileUploadZone } from "@/components/file-upload-zone"
import { ProcessingStatus } from "@/components/processing-status"
import { DatabaseViewer } from "@/components/database-viewer"
import { Header } from "@/components/header"
import { usePyodide } from "@/hooks/use-pyodide"
import type { ProcessingResult } from "@/lib/pyodide-worker"

export default function IFCDataBrowser() {
  const [currentView, setCurrentView] = useState<"upload" | "processing" | "database">("upload")
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [databaseData, setDatabaseData] = useState<ProcessingResult | null>(null)

  const { status, isInitialized, initializePyodide, processIfcFile, cleanup } = usePyodide()

  // Initialize Pyodide on component mount
  useEffect(() => {
    initializePyodide().catch(console.error)

    return () => {
      cleanup()
    }
  }, [initializePyodide, cleanup])

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

      <main className="container mx-auto px-4 py-8">
        {currentView === "upload" && (
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="font-serif text-4xl font-bold text-foreground mb-4">IFC Data Browser</h1>
              <p className="text-muted-foreground text-lg">
                Upload your IFC files to analyze building data with our WebAssembly-powered IfcOpenShell integration
              </p>
              {!isInitialized && (
                <p className="text-sm text-muted-foreground mt-2">Initializing WebAssembly runtime...</p>
              )}
            </div>
            <FileUploadZone onFileUpload={handleFileUpload} disabled={!isInitialized} />
          </div>
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
          <DatabaseViewer data={databaseData} onBackToUpload={handleBackToUpload} fileName={uploadedFile?.name} />
        )}
      </main>
    </div>
  )
}
