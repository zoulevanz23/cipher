interface AboutProps {
  onClose: () => void;
}

export function About({ onClose }: AboutProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 pb-8">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[80vh] overflow-y-auto glass rounded-2xl border border-border p-6 sm:p-8 animate-slide-up">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl scan-gradient flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path d="M12 5c-5.5 0-9.5 3.5-12 7 2.5 3.5 6.5 7 12 7s9.5-3.5 12-7c-2.5-3.5-6.5-7-12-7z" fill="currentColor"/>
                <circle cx="12" cy="12" r="3" fill="#0f0f12"/>
                <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold">About Cipher</h2>
              <p className="text-xs text-gray-500 font-mono">v0.1.0</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-gray-400 hover:text-body-text transition-colors shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <p className="text-xs text-accent font-mono mb-1">// Creator</p>
            <div className="bg-surface-2 border border-border rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full scan-gradient flex items-center justify-center text-sm font-bold text-white">
                  J
                </div>
                <div>
                  <p className="font-semibold text-sm">Josh Ivan Sartin</p>
                  <p className="text-xs text-gray-500 font-mono">Software Engineer</p>
                </div>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Built to help developers secure their supply chain by catching
                vulnerable dependencies before they ship to production.
                Also available as a <span className="text-accent font-mono">pip install cipher</span> CLI
                &mdash; no server or browser needed.
              </p>
            </div>
          </div>

          <div>
            <p className="text-xs text-accent font-mono mb-1">// Data Source</p>
            <div className="bg-surface-2 border border-border rounded-xl p-4 space-y-2">
              <div className="flex items-start gap-3">
                <span className="text-accent font-mono text-xs mt-0.5">&gt;</span>
                <div>
                  <p className="text-sm font-medium">OSV.dev</p>
                  <p className="text-xs text-gray-400">
                    Open Source Vulnerabilities — a distributed database
                    of vulnerability entries for open source projects.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-accent font-mono text-xs mt-0.5">&gt;</span>
                <div>
                  <p className="text-sm font-medium">NVD</p>
                  <p className="text-xs text-gray-400">
                    National Vulnerability Database — the U.S. government
                    repository of standards-based vulnerability data.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-accent font-mono text-xs mt-0.5">&gt;</span>
                <div>
                  <p className="text-sm font-medium">GitHub Advisory Database</p>
                  <p className="text-xs text-gray-400">
                    Security advisories for open source packages hosted on GitHub.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs text-accent font-mono mb-1">// Tech Stack</p>
            <div className="bg-surface-2 border border-border rounded-xl p-4">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <span className="text-gray-500">Backend:</span>
                <span className="text-gray-300 font-mono">Python + FastAPI</span>
                <span className="text-gray-500">Frontend:</span>
                <span className="text-gray-300 font-mono">React + Vite + Tailwind</span>
                <span className="text-gray-500">Scanner:</span>
                <span className="text-gray-300 font-mono">OSV API + httpx</span>
                <span className="text-gray-500">CLI:</span>
                <span className="text-gray-300 font-mono">Python + Click + Rich</span>
              </div>
            </div>
          </div>

          <div className="text-center pt-2">
            <p className="text-[10px] text-gray-600 font-mono">
              MIT License &middot; 2026
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
