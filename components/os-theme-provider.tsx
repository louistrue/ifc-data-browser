"use client"

import React from "react"

export type OsTheme = 'mac' | 'xp'

interface OsThemeContextType {
    osTheme: OsTheme
    setOsTheme: (theme: OsTheme) => void
    mounted: boolean
}

const OsThemeContext = React.createContext<OsThemeContextType | undefined>(undefined)

export function OsThemeProvider({ children }: { children: React.ReactNode }) {
    const [osTheme, setOsThemeState] = React.useState<OsTheme>('mac')
    const [mounted, setMounted] = React.useState(false)

    React.useEffect(() => {
        setMounted(true)

        // Get OS theme from localStorage (only on client)
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('os-theme') as OsTheme
            if (stored && ['mac', 'xp'].includes(stored)) {
                setOsThemeState(stored)
            } else {
                // Default behavior: detect if user is on Mac and set opposite theme
                const isMac = /Mac|iPhone|iPad/.test(navigator.userAgent)
                const defaultTheme = isMac ? 'xp' : 'mac'
                setOsThemeState(defaultTheme)
            }
        }
    }, [])

    React.useEffect(() => {
        if (!mounted || typeof window === 'undefined') return

        const root = document.documentElement

        if (osTheme === 'xp') {
            root.classList.add('theme-xp')
        } else {
            root.classList.remove('theme-xp')
        }

        // Store OS theme preference
        localStorage.setItem('os-theme', osTheme)
    }, [osTheme, mounted])

    const setOsTheme = React.useCallback((newTheme: OsTheme) => {
        setOsThemeState(newTheme)
    }, [])

    const value = React.useMemo(
        () => ({ osTheme, setOsTheme, mounted }),
        [osTheme, setOsTheme, mounted]
    )

    // Always provide the context, even during SSR
    return <OsThemeContext.Provider value={value}>{children}</OsThemeContext.Provider>
}

export function useOsTheme() {
    const context = React.useContext(OsThemeContext)
    if (context === undefined) {
        throw new Error('useOsTheme must be used within an OsThemeProvider')
    }
    return context
}
