import { ThemeToggle } from "./ThemeToggle";

interface NavbarProps {
  onAbout: () => void;
  onHistory: () => void;
  onNews: () => void;
  onFeatures?: () => void;
  onHome?: () => void;
  activeView: string;
}

export function Navbar({ onAbout, onHistory, onNews, onFeatures, onHome, activeView }: NavbarProps) {
  const linkClass = (view: string) =>
    `transition-colors font-mono text-xs cursor-pointer select-none px-3 py-2 rounded-lg ${
      activeView === view
        ? "text-accent bg-accent/10"
        : "text-gray-400 hover:text-accent hover:bg-surface-2/50"
    }`;

  return (
    <nav className="sticky top-0 z-50 glass border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <button
            onClick={() => onHome?.()}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer select-none"
          >
            <div className="w-8 h-8 rounded-lg scan-gradient flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path d="M12 5c-5.5 0-9.5 3.5-12 7 2.5 3.5 6.5 7 12 7s9.5-3.5 12-7c-2.5-3.5-6.5-7-12-7z" fill="currentColor"/>
                <circle cx="12" cy="12" r="3" fill="#0f0f12"/>
                <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
              </svg>
            </div>
            <span className="text-lg font-bold tracking-tight">
              <span className="text-gray-400 font-mono text-sm mr-1">$</span>
              <span className="text-accent">Cipher</span>
            </span>
          </button>
          <div className="flex items-center gap-1 text-sm">
            <button onClick={onFeatures} className={linkClass("features")}>
              ./features
            </button>
            <button onClick={onHistory} className={linkClass("history")}>
              ./history
            </button>
            <button onClick={onNews} className={linkClass("news")}>
              ./news
            </button>
            <button onClick={onAbout} className={linkClass("about")}>
              ./about
            </button>
            <div className="w-px h-5 bg-border mx-1" />
            <a
              href="/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors font-mono text-xs cursor-pointer px-3 py-2 rounded-lg text-gray-400 hover:text-accent hover:bg-surface-2/50"
            >
              API
            </a>
            <a
              href="https://osv.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors font-mono text-xs cursor-pointer px-3 py-2 rounded-lg text-gray-400 hover:text-accent hover:bg-surface-2/50"
            >
              osv.dev
            </a>
            <ThemeToggle />
            <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-accent/5 text-accent border border-accent/20 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              ONLINE
            </span>
          </div>
        </div>
      </div>
    </nav>
  );
}
