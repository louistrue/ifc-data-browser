"use client"

import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { UploadIcon, FileIcon, AlertCircleIcon, InfoIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface FileUploadZoneProps {
  onFileUpload: (file: File) => void
  disabled?: boolean // Add disabled prop for when Pyodide is not ready
}

export function FileUploadZone({ onFileUpload, disabled = false }: FileUploadZoneProps) {
  const [error, setError] = useState<string | null>(null)

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: any[]) => {
      setError(null)

      if (rejectedFiles.length > 0) {
        const rejection = rejectedFiles[0]
        if (rejection.errors.some((e: any) => e.code === "file-too-large")) {
          setError("File is too large. Please upload a file smaller than 100MB.")
        } else if (rejection.errors.some((e: any) => e.code === "file-invalid-type")) {
          setError("Invalid file type. Please upload a valid IFC file (.ifc)")
        } else {
          setError("Please upload a valid IFC file (.ifc)")
        }
        return
      }

      if (acceptedFiles.length > 0) {
        onFileUpload(acceptedFiles[0])
      }
    },
    [onFileUpload],
  )

  const { getRootProps, getInputProps, isDragActive, isDragAccept, isDragReject } = useDropzone({
    onDrop,
    accept: {
      "application/octet-stream": [".ifc"],
      "text/plain": [".ifc"],
      "application/step": [".ifc"],
      "model/ifc": [".ifc"],
    },
    maxFiles: 1,
    maxSize: 100 * 1024 * 1024, // 100MB
    disabled, // Disable dropzone when not ready
  })

  return (
    <div className="space-y-6">
      <Card className="w-full">
        <CardContent className="p-8">
          <div
            {...getRootProps()}
            className={cn(
              "border-2 border-dashed rounded-lg p-12 text-center transition-all duration-200",
              disabled
                ? "cursor-not-allowed opacity-50 border-muted-foreground/30"
                : "cursor-pointer hover:border-primary/50 hover:bg-muted/50 hover:scale-[1.02]",
              !disabled && isDragActive && "border-primary bg-primary/5 scale-[1.02]",
              !disabled && isDragAccept && "border-primary bg-primary/10",
              !disabled && isDragReject && "border-destructive bg-destructive/5",
            )}
          >
            <input {...getInputProps()} />

            <div className="flex flex-col items-center space-y-4">
              <div
                className={cn(
                  "w-16 h-16 rounded-full flex items-center justify-center transition-colors",
                  disabled ? "bg-muted-foreground/10" : isDragActive ? "bg-primary/20" : "bg-primary/10",
                )}
              >
                <UploadIcon
                  className={cn("w-8 h-8 transition-colors", disabled ? "text-muted-foreground/50" : "text-primary")}
                />
              </div>

              <div className="space-y-2">
                <h3
                  className={cn(
                    "font-inter text-xl font-semibold",
                    disabled ? "text-muted-foreground" : "text-foreground",
                  )}
                >
                  {disabled
                    ? "Initializing WebAssembly..."
                    : isDragActive
                      ? "Drop your IFC file here"
                      : "Upload IFC File"}
                </h3>
                <p className="text-muted-foreground">
                  {disabled
                    ? "Please wait while we load the processing engine"
                    : "Drag and drop your IFC file here, or click to browse"}
                </p>
                <p className="text-sm text-muted-foreground">Supports .ifc files up to 100MB</p>
              </div>

              <Button variant="outline" className="mt-4 bg-transparent" disabled={disabled}>
                <FileIcon className="w-4 h-4 mr-2" />
                Choose File
              </Button>
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center space-x-2">
              <AlertCircleIcon className="w-4 h-4 text-destructive flex-shrink-0" />
              <span className="text-sm text-destructive">{error}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-muted/30">
        <CardContent className="p-6">
          <div className="flex items-start space-x-3">
            <InfoIcon className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h4 className="font-medium text-foreground">About IFC Files</h4>
              <p className="text-sm text-muted-foreground">
                Industry Foundation Classes (IFC) is an open standard for Building Information Modeling (BIM) data. Our
                tool converts your IFC files into a queryable SQL database format using IfcOpenShell, allowing you to
                analyze building data, relationships, and properties efficiently.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-md">IFC2X3</span>
                <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-md">IFC4</span>
                <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-md">IFC4X3</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
