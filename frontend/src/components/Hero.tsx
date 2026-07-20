import { RadarScan } from "./RadarScan";

export function Hero() {
  return (
    <section className="relative pt-24 pb-20 min-h-[90vh] overflow-hidden hex-grid">
      <RadarScan />
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/3 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-5xl mx-auto text-center px-4 sm:px-6">
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-tight">
          <span
            className="glitch-wrapper bg-gradient-to-r from-accent via-emerald-400 to-accent bg-clip-text text-transparent"
            data-text="Cipher"
          >
            Cipher
          </span>
        </h1>

        <p className="mt-4 text-lg sm:text-xl text-gray-400 font-mono">
          <span className="text-accent">$</span> Software Composition Analysis
        </p>

        <p className="mt-6 text-base text-gray-500 max-w-2xl mx-auto leading-relaxed font-mono text-sm">
          <span className="text-gray-600">//</span> Scan <span className="text-accent">npm</span>, <span className="text-accent">pip</span>, <span className="text-accent">Go</span>, <span className="text-accent">Maven</span>, <span className="text-accent">Cargo</span> &mdash;
          detect vulnerabilities, licenses, unmaintained packages, and get fix suggestions.
          No sign-up required.
        </p>

        <div className="flex items-center justify-center gap-3 mt-8 mb-8">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-2 border border-border">
            <div className="w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_6px_rgba(0,255,65,0.6)]" />
            <span className="text-[11px] font-mono text-accent font-medium">OSV</span>
          </div>
          <svg className="w-3 h-3 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75" />
          </svg>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-2 border border-border">
            <div className="w-1.5 h-1.5 rounded-full bg-info shadow-[0_0_6px_rgba(55,66,250,0.6)]" />
            <span className="text-[11px] font-mono text-info font-medium">NVD</span>
          </div>
          <svg className="w-3 h-3 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75" />
          </svg>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-2 border border-border">
            <div className="w-1.5 h-1.5 rounded-full bg-gray-400 shadow-[0_0_6px_rgba(156,163,175,0.6)]" />
            <span className="text-[11px] font-mono text-gray-300 font-medium">GHSA</span>
          </div>
        </div>

        {/* Feature quick-cards */}
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto">
          {[
            { icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>, label: "Vulnerability Scan", sub: "OSV + NVD" },
            { icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>, label: "License Check", sub: "MIT, GPL, Apache..." },
            { icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>, label: "Health Scores", sub: "0-100 per package" },
            { icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>, label: "SBOM Export", sub: "SPDX · CycloneDX" },
          ].map((f) => (
            <div
              key={f.label}
              className="bg-surface-2/60 border border-border rounded-xl p-3 hover:bg-surface-2 hover:border-accent/20 transition-all group cursor-default"
            >
              <div className="text-accent/80 mb-1.5">{f.icon}</div>
              <div className="text-xs font-semibold text-gray-200 group-hover:text-accent transition-colors">{f.label}</div>
              <div className="text-[9px] font-mono text-gray-600 mt-0.5">{f.sub}</div>
            </div>
          ))}
        </div>

        {/* CLI command */}
        <div className="mt-6 flex justify-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-2 border border-border text-xs font-mono text-gray-400">
            <span className="text-accent">$</span>
            <span>pip install cipher</span>
            <span className="text-gray-600">&amp;&amp;</span>
            <span className="text-accent">cipher</span>
            <span className="text-gray-500">scan --path ./your-project</span>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-3 text-xs font-mono text-gray-500">
          {["NO_API_KEY", "7_ECOSYSTEMS", "LOCK_FILE_SUPPORT", "SARIF_EXPORT", "CI_READY", "VSCODE_EXT"].map((tag, i) => (
            <span
              key={tag}
              className="px-3 py-1.5 rounded-md bg-surface-2 border border-border text-accent/70 animate-slide-up"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              {">"} {tag}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
