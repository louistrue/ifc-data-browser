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
    <div className="space-y-2">
      <Card className="w-full">
        <CardContent className="p-3">
          <div
            {...getRootProps()}
            className={cn(
              "border-2 border-dashed rounded-lg p-4 text-center transition-all duration-200",
              disabled
                ? "cursor-not-allowed opacity-50 border-muted-foreground/30"
                : "cursor-pointer hover:border-primary/50 hover:bg-muted/50 hover:scale-[1.02]",
              !disabled && isDragActive && "border-primary bg-primary/5 scale-[1.02]",
              !disabled && isDragAccept && "border-primary bg-primary/10",
              !disabled && isDragReject && "border-destructive bg-destructive/5",
            )}
          >
            <input {...getInputProps()} />

            <div className="flex flex-col items-center space-y-2">
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                  disabled ? "bg-muted-foreground/10" : isDragActive ? "bg-primary/20" : "bg-primary/10",
                )}
              >
                <UploadIcon
                  className={cn("w-5 h-5 transition-colors", disabled ? "text-muted-foreground/50" : "text-primary")}
                />
              </div>

              <div className="space-y-1">
                <h3
                  className={cn(
                    "font-inter text-sm font-semibold",
                    disabled ? "text-muted-foreground" : "text-foreground",
                  )}
                >
                  {disabled
                    ? "Initializing..."
                    : isDragActive
                      ? "Drop IFC file here"
                      : "Upload IFC File"}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {disabled
                    ? "Loading processing engine"
                    : "Drag & drop or click to browse"}
                </p>
                <p className="text-xs text-muted-foreground">Up to 100MB</p>
              </div>

              <Button variant="outline" size="sm" className="mt-1 bg-transparent" disabled={disabled}>
                <FileIcon className="w-3 h-3 mr-1" />
                Choose File
              </Button>
            </div>
          </div>

          {error && (
            <div className="mt-2 p-2 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center space-x-2">
              <AlertCircleIcon className="w-3 h-3 text-destructive flex-shrink-0" />
              <span className="text-xs text-destructive">{error}</span>
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  )
}
