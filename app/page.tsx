"use client"

import { useState, useEffect } from "react"
import { FileUploadZone } from "@/components/file-upload-zone"
import { ProcessingStatus } from "@/components/processing-status"
import { DatabaseViewer } from "@/components/database-viewer"
import { Header } from "@/components/header"
import { usePyodide } from "@/hooks/use-pyodide"
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
import useEmblaCarousel from "embla-carousel-react"

export default function IFCDataBrowser() {
  const [currentView, setCurrentView] = useState<"upload" | "processing" | "database">("upload")
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [databaseData, setDatabaseData] = useState<ProcessingResult | null>(null)
  const [mounted, setMounted] = useState(false)
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: "start" })

  // Prevent hydration issues
  useEffect(() => {
    setMounted(true)
  }, [])
  const carouselSlides = [
    {
      title: "Explore IFC with retro joy",
      subtitle: "A playful, powerful way to dive into building data."
    },
    {
      title: "Turn models into instant insights",
      subtitle: "Query IFC data effortlessly—right in your browser."
    },
    {
      title: "All in-browser. Zero installs.",
      subtitle: "Privacy-first. Fast. Fun. Your data stays with you."
    },
    {
      title: "Query, browse, and smile",
      subtitle: "Because exploring buildings should feel delightful."
    }
  ]

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

  // Auto-advance hero carousel
  useEffect(() => {
    if (!emblaApi) return
    const id = setInterval(() => {
      try {
        emblaApi.scrollNext()
      } catch { }
    }, 3000)
    return () => clearInterval(id)
  }, [emblaApi])

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
    <div className="min-h-screen retro-desktop">
      <Header showOsToggle={currentView === "upload"} />

      <main className="min-h-screen">
        {currentView === "upload" && (
          <>
            {/* Retro Hero Window */}
            <div className="container mx-auto px-4 py-10">
              <div className="retro-window retro-pop max-w-5xl mx-auto" id="hero-window">
                <div className="retro-titlebar">
                  <div className="retro-controls">
                    <span className="retro-control red" onClick={() => document.getElementById('hero-window')?.classList.add('window-closed')} />
                    <span className="retro-control yellow" onClick={() => document.getElementById('hero-window')?.classList.toggle('window-minimized')} />
                    <span
                      className="retro-control green"
                      onClick={() => {
                        const el = document.getElementById('hero-window')
                        if (!el) return
                        el.classList.toggle('window-maximized')
                        el.classList.add('window-wiggle')
                        setTimeout(() => el.classList.remove('window-wiggle'), 350)
                      }}
                    />
                  </div>
                  <span className="retro-title">IFC Data Browser</span>
                </div>
                <div className="retro-window-content">
                  <div className="max-w-3xl mx-auto">
                    {mounted && (
                      <div className="overflow-hidden" ref={emblaRef}>
                        <div className="flex">
                          {carouselSlides.map((slide, idx) => (
                            <div key={idx} className="min-w-0 flex-[0_0_100%] px-2">
                              <div className="text-center px-2">
                                <h1 className="font-inter text-4xl md:text-5xl font-bold text-foreground mb-3 tracking-tight">
                                  {slide.title}
                                </h1>
                                <p className="text-base md:text-lg text-muted-foreground mb-2">
                                  {slide.subtitle}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {!isInitialized && (
                      <p className="text-center text-xs text-muted-foreground mt-2">Initializing WebAssembly runtime…</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content Grid */}
            <div className="container mx-auto px-4 py-12">
              <div className="grid lg:grid-cols-3 gap-8 max-w-7xl mx-auto">

                {/* Left Column - Upload & Quick Info */}
                <div className="lg:col-span-2 space-y-8">
                  {/* Upload Window */}
                  <div className="retro-window retro-pop" id="upload-window">
                    <div className="retro-titlebar">
                      <div className="retro-controls">
                        <span className="retro-control red" onClick={() => document.getElementById('upload-window')?.classList.add('window-closed')} />
                        <span className="retro-control yellow" onClick={() => document.getElementById('upload-window')?.classList.toggle('window-minimized')} />
                        <span
                          className="retro-control green"
                          onClick={() => {
                            const el = document.getElementById('upload-window')
                            if (!el) return
                            el.classList.toggle('window-maximized')
                            el.classList.add('window-wiggle')
                            setTimeout(() => el.classList.remove('window-wiggle'), 350)
                          }}
                        />
                      </div>
                      <span className="retro-title">Upload IFC Model</span>
                    </div>
                    <div className="retro-window-content">
                      <FileUploadZone onFileUpload={handleFileUpload} disabled={!isInitialized} />
                    </div>
                  </div>

                  {/* About Window */}
                  <div className="retro-window retro-pop" id="about-window">
                    <div className="retro-titlebar">
                      <div className="retro-controls">
                        <span className="retro-control red" onClick={() => document.getElementById('about-window')?.classList.add('window-closed')} />
                        <span className="retro-control yellow" onClick={() => document.getElementById('about-window')?.classList.toggle('window-minimized')} />
                        <span
                          className="retro-control green"
                          onClick={() => {
                            const el = document.getElementById('about-window')
                            if (!el) return
                            el.classList.toggle('window-maximized')
                            el.classList.add('window-wiggle')
                            setTimeout(() => el.classList.remove('window-wiggle'), 350)
                          }}
                        />
                      </div>
                      <span className="retro-title">About IFCsql</span>
                    </div>
                    <div className="retro-window-content">
                      <h3 className="font-inter font-semibold text-foreground mb-2 flex items-center gap-2">
                        <DatabaseIcon className="w-4 h-4" />
                        Built for exploration
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Convert complex building models into queryable databases without desktop software.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className="text-xs">IFC2X3</Badge>
                        <Badge variant="outline" className="text-xs">IFC4</Badge>
                        <Badge variant="outline" className="text-xs">IFC4X3</Badge>
                        <Badge variant="outline" className="text-xs">WebAssembly</Badge>
                        <Badge variant="outline" className="text-xs">Open Source</Badge>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column - Key Information Cards */}
                <div className="space-y-6">
                  {/* Privacy Window */}
                  <div className="retro-window retro-pop" id="privacy-window">
                    <div className="retro-titlebar">
                      <div className="retro-controls">
                        <span className="retro-control red" onClick={() => document.getElementById('privacy-window')?.classList.add('window-closed')} />
                        <span className="retro-control yellow" onClick={() => document.getElementById('privacy-window')?.classList.toggle('window-minimized')} />
                        <span
                          className="retro-control green"
                          onClick={() => {
                            const el = document.getElementById('privacy-window')
                            if (!el) return
                            el.classList.toggle('window-maximized')
                            el.classList.add('window-wiggle')
                            setTimeout(() => el.classList.remove('window-wiggle'), 350)
                          }}
                        />
                      </div>
                      <span className="retro-title">Privacy First</span>
                    </div>
                    <div className="retro-window-content">
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
                    </div>
                  </div>

                  {/* Verify Window */}
                  <div className="retro-window retro-pop" id="verify-window">
                    <div className="retro-titlebar">
                      <div className="retro-controls">
                        <span className="retro-control red" onClick={() => document.getElementById('verify-window')?.classList.add('window-closed')} />
                        <span className="retro-control yellow" onClick={() => document.getElementById('verify-window')?.classList.toggle('window-minimized')} />
                        <span
                          className="retro-control green"
                          onClick={() => {
                            const el = document.getElementById('verify-window')
                            if (!el) return
                            el.classList.toggle('window-maximized')
                            el.classList.add('window-wiggle')
                            setTimeout(() => el.classList.remove('window-wiggle'), 350)
                          }}
                        />
                      </div>
                      <span className="retro-title">Verify Security</span>
                    </div>
                    <div className="retro-window-content">
                      <p className="text-xs text-blue-700 dark:text-blue-300 mb-2">Check browser dev tools:</p>
                      <div className="space-y-1 text-xs text-blue-600 dark:text-blue-400">
                        <div>• Press <code className="bg-blue-100 dark:bg-blue-900 px-1 py-0.5 rounded text-xs">F12</code></div>
                        <div>• Network tab shows <code className="bg-blue-100 dark:bg-blue-900 px-1 py-0.5 rounded text-xs">0 B</code> uploaded</div>
                      </div>
                    </div>
                  </div>

                  {/* Built With Window */}
                  <div className="retro-window retro-pop" id="builtwith-window">
                    <div className="retro-titlebar">
                      <div className="retro-controls">
                        <span className="retro-control red" onClick={() => document.getElementById('builtwith-window')?.classList.add('window-closed')} />
                        <span className="retro-control yellow" onClick={() => document.getElementById('builtwith-window')?.classList.toggle('window-minimized')} />
                        <span
                          className="retro-control green"
                          onClick={() => {
                            const el = document.getElementById('builtwith-window')
                            if (!el) return
                            el.classList.toggle('window-maximized')
                            el.classList.add('window-wiggle')
                            setTimeout(() => el.classList.remove('window-wiggle'), 350)
                          }}
                        />
                      </div>
                      <span className="retro-title">Built With</span>
                    </div>
                    <div className="retro-window-content">
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-amber-600 dark:text-amber-400">IfcOpenShell</span>
                          <span className="text-[10px] px-1 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">Core</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-amber-600 dark:text-amber-400">Pyodide</span>
                          <span className="text-[10px] px-1 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">WASM</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-amber-600 dark:text-amber-400">Next.js</span>
                          <span className="text-[10px] px-1 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">UI</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Resources Window */}
                  <div className="retro-window retro-pop" id="resources-window">
                    <div className="retro-titlebar">
                      <div className="retro-controls">
                        <span className="retro-control red" onClick={() => document.getElementById('resources-window')?.classList.add('window-closed')} />
                        <span className="retro-control yellow" onClick={() => document.getElementById('resources-window')?.classList.toggle('window-minimized')} />
                        <span
                          className="retro-control green"
                          onClick={() => {
                            const el = document.getElementById('resources-window')
                            if (!el) return
                            el.classList.toggle('window-maximized')
                            el.classList.add('window-wiggle')
                            setTimeout(() => el.classList.remove('window-wiggle'), 350)
                          }}
                        />
                      </div>
                      <span className="retro-title">Resources</span>
                    </div>
                    <div className="retro-window-content">
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
                          href="https://github.com/louistrue/ifc-data-browser/tree/main"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Project Repository
                        </a>
                        <a
                          href="https://www.lt.plus"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-muted-foreground hover:text-foreground transition-colors"
                        >
                          www.lt.plus
                        </a>
                      </div>
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
