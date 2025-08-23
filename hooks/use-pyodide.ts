"use client"

import { useState, useCallback, useRef } from "react"
import { createPyodideWorker, type PyodideMessage, type ProcessingResult } from "@/lib/pyodide-worker"

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

  const initializePyodide = useCallback(async () => {
    if (isInitialized || workerRef.current) return

    return new Promise<void>((resolve, reject) => {
      const worker = createPyodideWorker()
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
            setIsInitialized(true)
            setStatus((prev) => ({ ...prev, isProcessing: false }))
            resolve()
            break

          case "error":
            setStatus((prev) => ({
              ...prev,
              isProcessing: false,
              error: data?.message || "Unknown error occurred",
            }))
            reject(new Error(data?.message || "Initialization failed"))
            break
        }
      }

      worker.onerror = (error) => {
        setStatus((prev) => ({
          ...prev,
          isProcessing: false,
          error: "Worker initialization failed",
        }))
        reject(new Error("Worker initialization failed"))
      }

      setStatus((prev) => ({ ...prev, isProcessing: true, progress: 0, currentStep: "Starting..." }))
      worker.postMessage({ type: "init" })
    })
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
              setStatus((prev) => ({
                ...prev,
                isProcessing: false,
                error: data?.message || "Processing failed",
              }))
              if (rejectRef.current) {
                rejectRef.current(new Error(data?.message || "Processing failed"))
                rejectRef.current = null
              }
              break
          }
        }

        // Convert file to ArrayBuffer
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

  const cleanup = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate()
      workerRef.current = null
    }
    setIsInitialized(false)
    setStatus({
      isProcessing: false,
      progress: 0,
      currentStep: "",
      error: null,
    })
  }, [])

  return {
    status,
    isInitialized,
    initializePyodide,
    processIfcFile,
    cleanup,
  }
}
