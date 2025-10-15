"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { createPyodideWorker, type PyodideMessage, type ProcessingResult } from "@/lib/pyodide-worker"
import type { SchemaDef } from "@/lib/schema"

export interface ProcessingStatus {
  isProcessing: boolean
  progress: number
  currentStep: string
  error: string | null
}

export function usePyodide() {
  const [status, setStatus] = useState<ProcessingStatus>({
    isProcessing: false,
    progress: 0,
    currentStep: "",
    error: null,
  })

  const [isInitialized, setIsInitialized] = useState(false)
  const workerRef = useRef<Worker | null>(null)
  const resolveRef = useRef<((result: ProcessingResult) => void) | null>(null)
  const rejectRef = useRef<((error: Error) => void) | null>(null)
  const initializationPromiseRef = useRef<Promise<void> | null>(null)

  const initializePyodide = useCallback(async () => {
    if (isInitialized) return Promise.resolve()
    if (initializationPromiseRef.current) return initializationPromiseRef.current
    if (workerRef.current) return Promise.resolve()

    const initPromise = new Promise<void>(async (resolve, reject) => {
      try {
        console.log("[v0] Creating new Pyodide worker")
        const worker = await createPyodideWorker()
        workerRef.current = worker

        worker.onmessage = (e: MessageEvent<PyodideMessage>) => {
          const { type, data, progress, step } = e.data

          switch (type) {
            case "progress":
              setStatus((prev) => ({
                ...prev,
                progress: progress || 0,
                currentStep: step || "",
              }))
              break

            case "init":
              console.log("[v0] Pyodide initialization complete")
              setIsInitialized(true)
              setStatus((prev) => ({ ...prev, isProcessing: false }))
              initializationPromiseRef.current = null
              resolve()
              break

            case "error":
              console.error("[v0] Pyodide initialization error:", data?.message)
              setStatus((prev) => ({
                ...prev,
                isProcessing: false,
                error: data?.message || "Unknown error occurred",
              }))
              initializationPromiseRef.current = null
              reject(new Error(data?.message || "Initialization failed"))
              break
          }
        }

        worker.onerror = (error) => {
          console.error("[v0] Worker error:", error)

          // Extract error message from the error event
          let errorMessage = "Worker initialization failed"
          if (error && typeof error === 'object') {
            const errorEvent = error as ErrorEvent
            if (errorEvent.message) {
              errorMessage = errorEvent.message

              // Provide user-friendly messages for common errors
              if (errorMessage.includes("IFC4X3") || errorMessage.includes("schema")) {
                errorMessage = "This IFC file uses IFC4X3 format which is not yet fully supported. Sorry about that, please try with an IFC4 or IFC2X3 in the meantime..."
              }
            }
          }

          setStatus((prev) => ({
            ...prev,
            isProcessing: false,
            error: errorMessage,
          }))
          initializationPromiseRef.current = null
          reject(new Error(errorMessage))
        }

        setStatus((prev) => ({ ...prev, isProcessing: true, progress: 0, currentStep: "Starting..." }))
        worker.postMessage({ type: "init" })
      } catch (error) {
        console.error("[v0] Failed to create worker:", error)
        reject(error)
      }
    })

    initializationPromiseRef.current = initPromise
    return initPromise
  }, [isInitialized])

  const processIfcFile = useCallback(
    async (file: File): Promise<ProcessingResult> => {
      if (!workerRef.current || !isInitialized) {
        throw new Error("Pyodide not initialized")
      }

      return new Promise<ProcessingResult>((resolve, reject) => {
        resolveRef.current = resolve
        rejectRef.current = reject

        const worker = workerRef.current!

        worker.onmessage = (e: MessageEvent<PyodideMessage>) => {
          const { type, data, progress, step } = e.data

          switch (type) {
            case "progress":
              setStatus((prev) => ({
                ...prev,
                progress: progress || 0,
                currentStep: step || "",
              }))
              break

            case "complete":
              setStatus((prev) => ({ ...prev, isProcessing: false, progress: 100 }))
              if (resolveRef.current) {
                resolveRef.current(data as ProcessingResult)
                resolveRef.current = null
              }
              break

            case "error":
              let errorMessage = data?.message || "Processing failed"

              // Provide user-friendly messages for common errors
              if (errorMessage.includes("IFC4X3") || errorMessage.includes("schema")) {
                errorMessage = "This IFC file uses IFC4X3 format which is not yet fully supported. Sorry about that, please try with an IFC4 or IFC2X3 in the meantime..."
              } else if (errorMessage.includes("Unsupported IFC schema")) {
                errorMessage = "This IFC file uses a schema version that is not supported. Please try converting the file to IFC4 or IFC2X3 format."
              }

              setStatus((prev) => ({
                ...prev,
                isProcessing: false,
                error: errorMessage,
              }))
              if (rejectRef.current) {
                rejectRef.current(new Error(errorMessage))
                rejectRef.current = null
              }
              break
          }
        }

        const reader = new FileReader()
        reader.onload = () => {
          setStatus((prev) => ({
            ...prev,
            isProcessing: true,
            progress: 0,
            currentStep: "Reading file...",
            error: null,
          }))

          worker.postMessage({
            type: "process",
            data: {
              fileBuffer: reader.result as ArrayBuffer,
              fileName: file.name,
            },
          })
        }

        reader.onerror = () => {
          const error = new Error("Failed to read file")
          setStatus((prev) => ({ ...prev, isProcessing: false, error: error.message }))
          if (rejectRef.current) {
            rejectRef.current(error)
            rejectRef.current = null
          }
        }

        reader.readAsArrayBuffer(file)
      })
    },
    [isInitialized],
  )

  const executeQuery = useCallback(
    async (query: string): Promise<any[]> => {
      if (!workerRef.current || !isInitialized) {
        throw new Error("Pyodide not initialized")
      }

      return new Promise<any[]>((resolve, reject) => {
        const worker = workerRef.current!

        worker.postMessage({
          type: "execute_query",
          data: { query: query.trim() },
        })

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
            originalOnMessage.call(worker, event)
          }
        }

        worker.onerror = (error) => {
          clearTimeout(timeout)
          console.error("[v0] Query worker error:", error)
          worker.onmessage = originalOnMessage
          reject(new Error("Worker execution failed"))
        }
      })
    },
    [isInitialized],
  )

  const getSchema = useCallback(
    async (): Promise<SchemaDef> => {
      if (!workerRef.current || !isInitialized) {
        throw new Error("Pyodide not initialized")
      }

      return new Promise<SchemaDef>((resolve, reject) => {
        const worker = workerRef.current!

        worker.postMessage({ type: "get_schema" })

        const timeout = setTimeout(() => {
          reject(new Error("Schema extraction timeout"))
        }, 30000)

        const originalOnMessage = worker.onmessage

        worker.onmessage = (event) => {
          const { type, data } = event.data as PyodideMessage

          if (type === "schema_result") {
            clearTimeout(timeout)
            worker.onmessage = originalOnMessage
            resolve(data as SchemaDef)
          } else if (type === "error") {
            clearTimeout(timeout)
            worker.onmessage = originalOnMessage
            reject(new Error(data?.message || "Schema extraction failed"))
          } else if (originalOnMessage) {
            originalOnMessage.call(worker, event)
          }
        }

        worker.onerror = (error) => {
          clearTimeout(timeout)
          console.error("[v0] Schema worker error:", error)
          worker.onmessage = originalOnMessage
          reject(new Error("Worker schema extraction failed"))
        }
      })
    },
    [isInitialized],
  )

  const exportSQLite = useCallback(
    async (): Promise<Uint8Array> => {
      if (!workerRef.current || !isInitialized) {
        throw new Error("Pyodide not initialized")
      }

      return new Promise<Uint8Array>((resolve, reject) => {
        const worker = workerRef.current!

        worker.postMessage({ type: "export_sqlite" })

        const timeout = setTimeout(() => {
          reject(new Error("SQLite export timeout"))
        }, 30000) // 30 second timeout

        const originalOnMessage = worker.onmessage

        worker.onmessage = (event) => {
          const { type, data } = event.data as any

          console.log("[v0] Export worker response:", { type, data })

          if (type === "sqlite_export") {
            clearTimeout(timeout)
            worker.onmessage = originalOnMessage
            // Convert ArrayBuffer to Uint8Array
            const bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : new Uint8Array(data)
            resolve(bytes)
          } else if (type === "error") {
            clearTimeout(timeout)
            worker.onmessage = originalOnMessage
            reject(new Error(data.message || "SQLite export failed"))
          } else if (originalOnMessage) {
            originalOnMessage.call(worker, event)
          }
        }

        worker.onerror = (error) => {
          clearTimeout(timeout)
          console.error("[v0] Export worker error:", error)
          worker.onmessage = originalOnMessage
          reject(new Error("Worker export failed"))
        }
      })
    },
    [isInitialized],
  )

  const cleanup = useCallback(() => {
    console.log("[v0] Cleaning up Pyodide worker")
    if (workerRef.current) {
      workerRef.current.terminate()
      workerRef.current = null
    }
    initializationPromiseRef.current = null
    setIsInitialized(false)
    setStatus({
      isProcessing: false,
      progress: 0,
      currentStep: "",
      error: null,
    })
  }, [])

  useEffect(() => {
    return () => {
      if (workerRef.current) {
        console.log("[v0] Component unmounting, terminating worker")
        workerRef.current.terminate()
      }
    }
  }, [])

  return {
    status,
    isInitialized,
    initializePyodide,
    processIfcFile,
    executeQuery,
    getSchema,
    exportSQLite,
    cleanup,
  }
}
