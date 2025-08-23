"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { MoonIcon, SunIcon, MonitorCog, MonitorSmartphone, DownloadIcon } from "lucide-react"
import { useTheme } from "@/components/theme-provider"

interface HeaderProps {
  showOsToggle?: boolean
  usePyodide?: any
  fileName?: string
  hasProcessedData?: boolean
}

export function Header({ showOsToggle = true, usePyodide, fileName, hasProcessedData = false }: HeaderProps) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  // Prevent hydration mismatch by only rendering after component mounts
  React.useEffect(() => {
    setMounted(true)
  }, [])

  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent)
  const [uiTheme, setUiTheme] = React.useState<'mac' | 'xp'>(isMac ? 'xp' : 'mac')

  React.useEffect(() => {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    if (uiTheme === 'xp') {
      root.classList.add('theme-xp')
    } else {
      root.classList.remove('theme-xp')
    }
  }, [uiTheme])

  const handleExportSQLite = async () => {
    if (!usePyodide) return

    try {
      const bytes: Uint8Array = await usePyodide.exportSQLite()
      const blob = new Blob([bytes], { type: "application/x-sqlite3" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      const base = (fileName || "database").replace(/\.ifc$/i, "")
      a.href = url
      a.download = `${base}.sqlite`
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Export failed:", error)
    }
  }

  return (
    <header className="retro-menu-bar">
      <div className="h-10 sm:h-8 flex items-center justify-between px-3 sm:px-4">
        <div className="flex items-center">
          <div className="flex items-center gap-2 select-none">
            <div className="w-6 h-6 rounded-[6px] border border-primary/40 bg-transparent flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]">
              <span className="font-black text-[10px] leading-none tracking-wider text-primary">IFC</span>
            </div>
            <span className="font-inter font-semibold text-[13px] leading-none tracking-tight text-foreground/90">
              Data Browser
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {showOsToggle && mounted && (
            <Button variant="ghost" size="icon" onClick={() => setUiTheme(uiTheme === 'mac' ? 'xp' : 'mac')} title={uiTheme === 'mac' ? 'Switch to XP' : 'Switch to Mac'}>
              {uiTheme === 'mac' ? <MonitorSmartphone className="h-4 w-4" /> : <MonitorCog className="h-4 w-4" />}
            </Button>
          )}
          {mounted && (
            <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              <SunIcon className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <MoonIcon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>
          )}
          {mounted && hasProcessedData && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExportSQLite}
              title="Export SQLite database"
              className="h-6 px-2 text-xs"
            >
              <DownloadIcon className="h-3 w-3 mr-1" />
              .sqlite
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
