"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { MoonIcon, SunIcon, MonitorCog, MonitorSmartphone } from "lucide-react"
import { useTheme } from "next-themes"

export function Header({ showOsToggle = true }: { showOsToggle?: boolean }) {
  const { theme, setTheme } = useTheme()
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent)
  const [uiTheme, setUiTheme] = React.useState<'mac' | 'xp'>(isMac ? 'xp' : 'mac')
  const [mounted, setMounted] = React.useState(false)

  // Prevent hydration mismatch by only rendering after component mounts
  React.useEffect(() => {
    setMounted(true)
  }, [])

  React.useEffect(() => {
    const root = document.documentElement
    if (uiTheme === 'xp') {
      root.classList.add('theme-xp')
    } else {
      root.classList.remove('theme-xp')
    }
  }, [uiTheme])

  return (
    <header className="retro-menu-bar">
      <div className="container mx-auto px-4 h-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 bg-primary/90 rounded-[6px] flex items-center justify-center shadow-sm">
            <span className="text-primary-foreground font-bold text-[11px] leading-none">IFC</span>
          </div>
          <span className="font-serif font-bold text-sm text-foreground">IFC Data Browser</span>
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
        </div>
      </div>
    </header>
  )
}
