import React from "react"

export function Footer() {
  return (
    <footer className="retro-footer text-[11px]">
      <div className="container mx-auto h-full flex items-center justify-center sm:justify-between px-3 gap-2">
        <div className="flex items-center gap-1">
          <span className="mac-icon">🍏</span>
          <span className="xp-icon">🪟</span>
          <a
            href="https://www.lt.plus"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            www.lt.plus
          </a>
        </div>
        <div className="hidden sm:block text-center">
          Made with <span className="text-red-500">❤️</span> by Louis Trümpler
        </div>
        <div>
          <a
            href="https://github.com/louistrue/ifc-data-browser"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            GitHub repo
          </a>
        </div>
      </div>
    </footer>
  )
}

export default Footer
