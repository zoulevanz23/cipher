interface FooterProps {
  onAbout: () => void;
}

export function Footer({ onAbout }: FooterProps) {
  return (
    <footer className="border-t border-border mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500 font-mono">
          <p>
            <span className="text-accent">$</span> ./cipher --version
            <span className="text-gray-600 ml-2">v0.1.0</span>
          </p>
          <div className="flex items-center gap-4">
            <button onClick={onAbout} className="hover:text-accent transition-colors">
              ./about
            </button>
            <span className="text-gray-700">|</span>
            <span>
              crafted by{" "}
              <span className="text-gray-400 hover:text-accent transition-colors cursor-default">
                Josh Ivan Sartin
              </span>
            </span>
            <span className="text-gray-700">|</span>
            <span>
              data:{" "}
              <a href="https://osv.dev" target="_blank" rel="noopener noreferrer" className="text-accent/70 hover:text-accent transition-colors">
                OSV
              </a>
              {" / "}
              <a href="https://nvd.nist.gov" target="_blank" rel="noopener noreferrer" className="text-accent/70 hover:text-accent transition-colors">
                NVD
              </a>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
