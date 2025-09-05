import { Github, Globe } from "lucide-react"
import CoffeeSupport from "./coffee-support"

export function Footer() {
  return (
    <footer className="retro-footer">
      <div className="container mx-auto h-10 sm:h-8 flex items-center justify-center gap-3 text-xs">
        <a
          href="https://www.lt.plus"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 footer-link"
        >
          <Globe className="h-3 w-3" />
          www.lt.plus
        </a>
        <span className="footer-separator">•</span>
        <a
          href="https://github.com/louistrue/ifc-data-browser"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 footer-link"
        >
          <Github className="h-3 w-3" />
          GitHub
        </a>
        <span className="footer-separator">•</span>
        <CoffeeSupport className="footer-text" />
      </div>
    </footer>
  )
}

