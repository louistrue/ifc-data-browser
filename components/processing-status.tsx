"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { CheckCircleIcon, LoaderIcon, XIcon, FileTextIcon, AlertCircleIcon } from "lucide-react"

interface ProcessingStatusProps {
  fileName: string
  onCancel: () => void
  progress?: number
  currentStep?: string
  error?: string | null
}

const processingSteps = [
  { id: 1, name: "Initializing Pyodide", description: "Loading WebAssembly runtime" },
  { id: 2, name: "Loading IfcOpenShell", description: "Importing IFC processing libraries" },
  { id: 3, name: "Parsing IFC File", description: "Reading and validating IFC structure" },
  { id: 4, name: "Converting to SQL", description: "Transforming data to database format" },
  { id: 5, name: "Finalizing Database", description: "Optimizing queries and indexing" },
]

export function ProcessingStatus({
  fileName,
  onCancel,
  progress = 0,
  currentStep = "",
  error = null,
}: ProcessingStatusProps) {
  const currentStepIndex = Math.min(Math.floor(progress / 20), processingSteps.length - 1)

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="font-serif text-2xl text-foreground">
            {error ? "Processing Failed" : "Processing IFC File"}
          </CardTitle>
          <p className="text-muted-foreground">
            Converting <span className="font-medium text-foreground">{fileName}</span> to SQL database
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* File Info */}
          <div className="flex items-center space-x-3 p-4 bg-muted/50 rounded-lg">
            <FileTextIcon className="w-5 h-5 text-primary" />
            <div>
              <p className="font-medium text-foreground">{fileName}</p>
              <p className="text-sm text-muted-foreground">IFC Building Information Model</p>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start space-x-3">
              <AlertCircleIcon className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-destructive">Processing Error</p>
                <p className="text-sm text-destructive/80 mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Progress Bar */}
          {!error && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="text-foreground font-medium">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              {currentStep && <p className="text-sm text-muted-foreground">{currentStep}</p>}
            </div>
          )}

          {/* Processing Steps */}
          {!error && (
            <div className="space-y-3">
              <h4 className="font-medium text-foreground">Processing Steps</h4>
              <div className="space-y-2">
                {processingSteps.map((step, index) => (
                  <div key={step.id} className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      {index < currentStepIndex ? (
                        <CheckCircleIcon className="w-5 h-5 text-primary" />
                      ) : index === currentStepIndex ? (
                        <LoaderIcon className="w-5 h-5 text-primary animate-spin" />
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p
                        className={`text-sm font-medium ${
                          index <= currentStepIndex ? "text-foreground" : "text-muted-foreground"
                        }`}
                      >
                        {step.name}
                      </p>
                      <p className="text-xs text-muted-foreground">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-center pt-4">
            <Button variant="outline" onClick={onCancel}>
              <XIcon className="w-4 h-4 mr-2" />
              {error ? "Back to Upload" : "Cancel Processing"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
