"use client"

import { useState, useEffect } from "react"
import { FileUploadZone } from "@/components/file-upload-zone"
import { ProcessingStatus } from "@/components/processing-status"
import { DatabaseViewer } from "@/components/database-viewer"
import { Header } from "@/components/header"
import { usePyodide } from "@/hooks/use-pyodide"
import { Badge } from "@/components/ui/badge"
import { WindowsControls } from "@/components/ui/windows-controls"
import {
  ShieldIcon,
  EyeIcon,
  ExternalLinkIcon,
  HeartIcon,
  DatabaseIcon,
  CodeIcon,
  GlobeIcon,
  FileTextIcon,
  SearchIcon,
  NetworkIcon,
  GraduationCapIcon,
  BookOpenIcon,
  UsersIcon,
  ZapIcon,
  LockIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  InfoIcon
} from "lucide-react"
import type { ProcessingResult } from "@/lib/pyodide-worker"

export default function IFCDataBrowser() {
  const [currentView, setCurrentView] = useState<"upload" | "processing" | "database">("upload")
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [databaseData, setDatabaseData] = useState<ProcessingResult | null>(null)
  const [mounted, setMounted] = useState(false)
  const [isAboutExpanded, setIsAboutExpanded] = useState(false)
  const [uiTheme, setUiTheme] = useState<'mac' | 'xp'>('mac')
  const [windowStates, setWindowStates] = useState<Record<string, { minimized: boolean; maximized: boolean; closed: boolean }>>({})

  // Sync with header theme - detect if we're on Mac and set initial theme
  useEffect(() => {
    const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent)
    setUiTheme(isMac ? 'xp' : 'mac') // Mac users get XP theme by default
  }, [])

  // Listen for theme changes from header
  useEffect(() => {
    const handleThemeChange = () => {
      const root = document.documentElement
      const isXpTheme = root.classList.contains('theme-xp')
      setUiTheme(isXpTheme ? 'xp' : 'mac')
    }

    // Create a MutationObserver to watch for class changes on documentElement
    const observer = new MutationObserver(handleThemeChange)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    })

    return () => observer.disconnect()
  }, [])

  // Prevent hydration issues
  useEffect(() => {
    setMounted(true)
  }, [])

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

  // Window control handlers
  const handleWindowAction = (windowId: string, action: 'close' | 'minimize' | 'maximize') => {
    setWindowStates(prev => ({
      ...prev,
      [windowId]: {
        ...prev[windowId],
        [action === 'close' ? 'closed' : action === 'minimize' ? 'minimized' : 'maximized']:
          action === 'close' ? true : !prev[windowId]?.[action === 'minimize' ? 'minimized' : 'maximized']
      }
    }))

    // Add animation classes to the window element
    const windowElement = document.getElementById(windowId)
    if (windowElement) {
      switch (action) {
        case 'close':
          windowElement.classList.add('window-shake', 'particle-burst')
          setTimeout(() => {
            windowElement.classList.remove('window-shake', 'particle-burst')
            // Actually hide the window after animation
            windowElement.style.display = 'none'

            // Special behavior for upload window - reappear after 2 seconds
            if (windowId === 'upload-window') {
              setTimeout(() => {
                windowElement.style.display = ''
                windowElement.style.opacity = '0'
                windowElement.classList.add('retro-pop')
                // Fade in animation
                setTimeout(() => {
                  windowElement.style.opacity = '1'
                  windowElement.style.transition = 'opacity 500ms ease-in-out'
                }, 50)
                // Reset transition after animation
                setTimeout(() => {
                  windowElement.style.transition = ''
                }, 550)
              }, 2000)
            }
          }, 400)
          break
        case 'minimize':
          windowElement.classList.add('window-collapse', 'bounce-in')
          setTimeout(() => {
            windowElement.classList.remove('window-collapse', 'bounce-in')
            // Hide content but keep titlebar visible
            const content = windowElement.querySelector('.retro-window-content') as HTMLElement
            if (content) {
              content.style.display = 'none'
            }
          }, 300)
          break
        case 'maximize':
          windowElement.classList.add('window-expand', 'window-wiggle')
          setTimeout(() => {
            windowElement.classList.remove('window-expand', 'window-wiggle')
            // Restore content if minimized, or toggle maximized state
            const content = windowElement.querySelector('.retro-window-content') as HTMLElement
            if (content) {
              content.style.display = ''
            }
            // Toggle maximized class for styling
            windowElement.classList.toggle('window-maximized')
          }, 350)
          break
      }
    }
  }

  return (
    <div className="min-h-screen retro-desktop">
      <Header
        showOsToggle={currentView === "upload"}
        usePyodide={usePyodideHook}
        fileName={uploadedFile?.name}
        hasProcessedData={!!databaseData}
      />

      <main className="min-h-screen">
        {currentView === "upload" && (
          <>
            {/* Hero + Upload Combined */}
            <div className="container mx-auto px-4 py-8">
              <div className="max-w-5xl mx-auto">
                {/* Hero Content */}
                <div className="text-center space-y-4 mb-8">
                  <h1 className="font-inter text-4xl md:text-5xl font-bold text-foreground tracking-tight leading-tight academic-heading">
                    Explore IFC Building Data as SQL
                  </h1>
                  <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto academic-text">
                    Convert IFC models into queryable SQL databases. Built for researchers and engineers.
                  </p>

                  {/* Inline Badges */}
                  <div className="flex flex-wrap justify-center gap-2">
                    <Badge variant="outline" className="text-xs academic-badge">
                      <CheckCircleIcon className="w-3 h-3 mr-1" />
                      Open Source
                    </Badge>
                    <Badge variant="outline" className="text-xs academic-badge">
                      <LockIcon className="w-3 h-3 mr-1" />
                      100% Client-Side
                    </Badge>
                    <Badge variant="outline" className="text-xs academic-badge">
                      <DatabaseIcon className="w-3 h-3 mr-1" />
                      IFC2X3 / IFC4
                    </Badge>
                  </div>
                </div>

                {/* Upload + Features Layout */}
                <div className="max-w-6xl mx-auto">
                  <div className="flex flex-col lg:flex-row gap-6 items-start">
                    {/* Left: Upload Cards */}
                    <div className="space-y-3 flex-1">
                      <div className="retro-window academic-card" id="upload-window">
                        <div className="retro-titlebar">
                          <WindowsControls
                            variant={uiTheme}
                            onClose={() => handleWindowAction('upload-window', 'close')}
                            onMinimize={() => handleWindowAction('upload-window', 'minimize')}
                            onMaximize={() => handleWindowAction('upload-window', 'maximize')}
                          />
                          <span className="retro-title">Upload IFC File</span>
                        </div>
                        <div className="retro-window-content p-3">
                          <FileUploadZone onFileUpload={handleFileUpload} disabled={!isInitialized} />
                          {!isInitialized && (
                            <p className="text-xs text-muted-foreground text-center mt-2">Initializing runtime…</p>
                          )}
                        </div>
                      </div>

                      {/* Expandable About IFC Files */}
                      <div className="retro-window academic-card" id="about-window">
                        <div className="retro-titlebar">
                          <WindowsControls
                            variant={uiTheme}
                            onClose={() => handleWindowAction('about-window', 'close')}
                            onMinimize={() => handleWindowAction('about-window', 'minimize')}
                            onMaximize={() => handleWindowAction('about-window', 'maximize')}
                          />
                          <button
                            className="flex items-center gap-2 text-left flex-1 cursor-pointer hover:bg-muted/20 rounded px-1 py-0.5 transition-colors"
                            onClick={() => setIsAboutExpanded(!isAboutExpanded)}
                            aria-expanded={isAboutExpanded}
                          >
                            {isAboutExpanded ? (
                              <ChevronDownIcon className="w-3 h-3" />
                            ) : (
                              <ChevronRightIcon className="w-3 h-3" />
                            )}
                            <InfoIcon className="w-3 h-3" />
                            <span className="retro-title">About IFC Files</span>
                          </button>
                        </div>
                        {(isAboutExpanded || !windowStates['about-window']?.minimized) && (
                          <div className="retro-window-content p-3 space-y-2">
                            <p className="text-sm text-muted-foreground">
                              Industry Foundation Classes (IFC) is an open standard for Building Information Modeling (BIM) data.
                              Our tool converts your IFC files into a queryable SQL database format using IfcOpenShell,
                              allowing you to analyze building data, relationships, and properties efficiently.
                            </p>
                            <div className="flex flex-wrap gap-2">
                              <Badge variant="outline" className="text-xs">IFC2X3</Badge>
                              <Badge variant="outline" className="text-xs">IFC4</Badge>
                              <Badge variant="outline" className="text-xs">IFC4X3</Badge>
                            </div>
                          </div>
                        )}
                        {windowStates['about-window']?.minimized && (
                          <div className="retro-window-content p-3">
                            <button
                              onClick={() => handleWindowAction('about-window', 'maximize')}
                              className="w-full p-2 bg-primary/10 hover:bg-primary/20 rounded border border-primary/20 text-primary text-sm font-medium transition-colors"
                            >
                              Click to expand About IFC Files
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Feature Cards */}
                    <div className="space-y-3 w-full lg:w-1/3">
                      {/* WebAssembly Powered */}
                      <div className="text-center space-y-1 p-3 bg-background rounded-lg border">
                        <div className="w-8 h-8 mx-auto bg-primary/10 rounded-lg flex items-center justify-center">
                          <ZapIcon className="w-4 h-4 text-primary" />
                        </div>
                        <h3 className="font-semibold text-foreground text-xs">WebAssembly Powered</h3>
                        <p className="text-xs text-muted-foreground leading-tight">
                          Process files locally in your browser. Zero server uploads, complete privacy.
                        </p>
                      </div>

                      {/* Standard SQL */}
                      <div className="text-center space-y-1 p-3 bg-background rounded-lg border">
                        <div className="w-8 h-8 mx-auto bg-primary/10 rounded-lg flex items-center justify-center">
                          <SearchIcon className="w-4 h-4 text-primary" />
                        </div>
                        <h3 className="font-semibold text-foreground text-xs">Standard SQL</h3>
                        <p className="text-xs text-muted-foreground leading-tight">
                          Query IFC data with familiar SQL syntax. Export results for analysis.
                        </p>
                      </div>

                      {/* Schema Visualization */}
                      <div className="text-center space-y-1 p-3 bg-background rounded-lg border">
                        <div className="w-8 h-8 mx-auto bg-primary/10 rounded-lg flex items-center justify-center">
                          <NetworkIcon className="w-4 h-4 text-primary" />
                        </div>
                        <h3 className="font-semibold text-foreground text-xs">Schema Visualization</h3>
                        <p className="text-xs text-muted-foreground leading-tight">
                          Interactive diagrams to explore IFC entity relationships.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>


            {/* Main Content Grid */}
            <div className="container mx-auto px-4 py-6">
              <div className="grid lg:grid-cols-2 gap-6 max-w-6xl mx-auto">

                {/* Left Column - Technical Details */}
                <div className="space-y-4">
                  {/* Technical Approach Window */}
                  <div className="retro-window retro-pop" id="technical-window">
                    <div className="retro-titlebar">
                      <WindowsControls
                        variant={uiTheme}
                        onClose={() => handleWindowAction('technical-window', 'close')}
                        onMinimize={() => handleWindowAction('technical-window', 'minimize')}
                        onMaximize={() => handleWindowAction('technical-window', 'maximize')}
                      />
                      <span className="retro-title">Technical Approach</span>
                    </div>
                    <div className="retro-window-content">
                      <div className="space-y-4">
                        <h3 className="font-inter font-semibold text-foreground mb-2 flex items-center gap-2">
                          <CodeIcon className="w-4 h-4" />
                          Methodology
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Converts IFC-SPF files to relational SQLite databases using IfcOpenShell compiled to WebAssembly.
                          The process includes schema inference, entity normalization, and relationship mapping.
                        </p>

                        {/* Architecture Flow */}
                        <div className="space-y-2 text-xs">
                          <div className="flex items-center gap-2 p-2 bg-muted/30 rounded border">
                            <FileTextIcon className="w-3 h-3 text-primary" />
                            <span>IFC-SPF File</span>
                            <span className="text-muted-foreground">→</span>
                            <span>Parser</span>
                          </div>
                          <div className="flex items-center gap-2 p-2 bg-muted/30 rounded border">
                            <DatabaseIcon className="w-3 h-3 text-primary" />
                            <span>Schema Inference</span>
                            <span className="text-muted-foreground">→</span>
                            <span>SQL Generation</span>
                          </div>
                          <div className="flex items-center gap-2 p-2 bg-muted/30 rounded border">
                            <SearchIcon className="w-3 h-3 text-primary" />
                            <span>SQLite Database</span>
                            <span className="text-muted-foreground">→</span>
                            <span>Query Interface</span>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline" className="text-xs">IfcOpenShell</Badge>
                          <Badge variant="outline" className="text-xs">Pyodide</Badge>
                          <Badge variant="outline" className="text-xs">WebAssembly</Badge>
                          <Badge variant="outline" className="text-xs">SQLite</Badge>
                        </div>
                      </div>
                    </div>
                  </div>


                  {/* Research Resources Window */}
                  <div className="retro-window retro-pop" id="resources-window">
                    <div className="retro-titlebar">
                      <WindowsControls
                        variant={uiTheme}
                        onClose={() => handleWindowAction('resources-window', 'close')}
                        onMinimize={() => handleWindowAction('resources-window', 'minimize')}
                        onMaximize={() => handleWindowAction('resources-window', 'maximize')}
                      />
                      <span className="retro-title">Research Resources</span>
                    </div>
                    <div className="retro-window-content">
                      <div className="space-y-3 text-xs">
                        <div className="space-y-2">
                          <a
                            href="https://ifcopenshell.org/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                          >
                            <BookOpenIcon className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                            <span className="text-blue-700 dark:text-blue-300">IfcOpenShell Documentation</span>
                          </a>
                          <a
                            href="https://standards.buildingsmart.org/IFC/RELEASE/IFC4_3/HTML/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 p-2 bg-purple-50 dark:bg-purple-900/20 rounded border border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
                          >
                            <GraduationCapIcon className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                            <span className="text-purple-700 dark:text-purple-300">IFC Standards Reference</span>
                          </a>
                          <a
                            href="https://github.com/louistrue/ifc-data-browser/tree/main"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                          >
                            <CodeIcon className="w-3 h-3 text-green-600 dark:text-green-400" />
                            <span className="text-green-700 dark:text-green-300">Project Repository</span>
                          </a>
                          <a
                            href="https://www.lt.plus"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 p-2 bg-orange-50 dark:bg-orange-900/20 rounded border border-orange-200 dark:border-orange-800 hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
                          >
                            <GlobeIcon className="w-3 h-3 text-orange-600 dark:text-orange-400" />
                            <span className="text-orange-700 dark:text-orange-300">Author Website</span>
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column - Use Cases & Resources */}
                <div className="space-y-4">
                  {/* Zero Server Architecture Window */}
                  <div className="retro-window retro-pop" id="architecture-window">
                    <div className="retro-titlebar">
                      <WindowsControls
                        variant={uiTheme}
                        onClose={() => handleWindowAction('architecture-window', 'close')}
                        onMinimize={() => handleWindowAction('architecture-window', 'minimize')}
                        onMaximize={() => handleWindowAction('architecture-window', 'maximize')}
                      />
                      <span className="retro-title">Zero Server Architecture</span>
                    </div>
                    <div className="retro-window-content">
                      <div className="space-y-3">
                        <p className="text-xs text-green-700 dark:text-green-300">
                          <strong>100% client-side processing.</strong> Your IFC data never leaves your device.
                        </p>
                        <div className="space-y-2 text-xs text-green-600 dark:text-green-400">
                          <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
                            <LockIcon className="w-3 h-3" />
                            <span>No external servers</span>
                          </div>
                          <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
                            <ZapIcon className="w-3 h-3" />
                            <span>WebAssembly execution</span>
                          </div>
                          <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
                            <EyeIcon className="w-3 h-3" />
                            <span>Verify: Network tab shows 0 B uploaded</span>
                          </div>
                        </div>
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
