import { Github, Globe, FileTextIcon, ScaleIcon } from "lucide-react"

export function Footer() {
  return (
    <footer className="retro-footer">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center justify-center gap-4 text-xs">
          {/* Centered Content */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <ScaleIcon className="h-3 w-3" />
              <a
                href="https://www.gnu.org/licenses/agpl-3.0.de.html"
                target="_blank"
                rel="noopener noreferrer"
                className="footer-link"
              >
                AGPL-3.0 License
              </a>
            </div>
            <span className="footer-separator">•</span>
            <div className="flex items-center gap-3">
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
              <a
                href="https://www.linkedin.com/in/louistrue/"
                target="_blank"
                rel="noopener noreferrer"
                className="footer-link"
              >
                Made by Louis Trümpler
              </a>
              <span className="footer-separator">•</span>
              <a
                href="https://buymeacoffee.com/louistrue"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 footer-link"
                aria-label="Buy me a coffee"
              >
                <img
                  src="/icons8-buy-me-a-coffee-100.png"
                  alt="Coffee"
                  className="h-4 w-4"
                />
                Support
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

