"use client"

import Link from "next/link"
import { useEffect, useState } from "react"

export default function Footer() {
  const [isXp, setIsXp] = useState(false)

  useEffect(() => {
    const handler = () => {
      if (typeof document !== "undefined") {
        setIsXp(document.documentElement.classList.contains("theme-xp"))
      }
    }
    handler()
    const observer = new MutationObserver(handler)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
    return () => observer.disconnect()
  }, [])

  return (
    <footer className="retro-footer text-xs flex items-center justify-center gap-4 px-3">
      <Link
        href="https://www.lt.plus"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1 hover:underline"
      >
        {isXp ? "🌐" : "🍎"}
        www.lt.plus
      </Link>
      <span className="opacity-40">|</span>
      <Link
        href="https://github.com/louistrue/ifc-data-browser"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1 hover:underline"
      >
        {isXp ? "🪟" : "<>"}
        GitHub
      </Link>
      <span className="opacity-40">|</span>
      <span className="flex items-center gap-1">
        Made with <span className="animate-pulse">❤️</span> by Louis Trümpler
      </span>
    </footer>
  )
}

