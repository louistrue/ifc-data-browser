"use client"

import React from "react"

export function Footer() {
  const [isXP, setIsXP] = React.useState(false)

  React.useEffect(() => {
    if (typeof document === "undefined") return
    const root = document.documentElement
    const update = () => setIsXP(root.classList.contains("theme-xp"))
    update()
    const observer = new MutationObserver(update)
    observer.observe(root, { attributes: true, attributeFilter: ["class"] })
    return () => observer.disconnect()
  }, [])

  return (
    <footer
      className={
        isXP
          ? "h-6 sm:h-8 flex items-center border-t border-[#1f3a7a] bg-gradient-to-t from-[#245ed1] to-[#3c8dff] text-white text-xs px-2 sm:px-4"
          : "h-6 sm:h-8 flex items-center border-t border-border/60 backdrop-blur bg-background/80 text-[11px] sm:text-xs px-2 sm:px-4"
      }
    >
      <div className="w-full flex items-center justify-between">
        <span className="flex items-center gap-1 whitespace-nowrap">
          Made with <span className="text-red-500">❤️</span> by Louis Trümpler
        </span>
        <div className="flex items-center gap-3">
          <a
            href="https://www.lt.plus"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            www.lt.plus
          </a>
          <a
            href="https://github.com/louistrue/ifc-data-browser"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            GitHub
          </a>
        </div>
      </div>
    </footer>
  )
}

