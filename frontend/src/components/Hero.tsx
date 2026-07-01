export function Hero() {
  return (
    <section className="relative pt-24 pb-16 overflow-hidden hex-grid">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/3 rounded-full blur-3xl" />

        <div className="absolute top-12 left-8 text-accent/10 font-mono text-[10px] leading-relaxed hidden lg:block">
          {"01101110 01110000 01101101".split(" ").map((b, i) => (
            <div key={i} className="matrix-char" style={{ animationDelay: `${i * 2}s` }}>{b}</div>
          ))}
        </div>
        <div className="absolute bottom-12 right-8 text-accent/10 font-mono text-[10px] leading-relaxed hidden lg:block">
          {"01110011 01100001 01100110 01100101".split(" ").map((b, i) => (
            <div key={i} className="matrix-char" style={{ animationDelay: `${i * 1.5}s` }}>{b}</div>
          ))}
        </div>
      </div>

      <div className="relative max-w-4xl mx-auto text-center px-4 sm:px-6">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/5 border border-accent/20 text-accent text-xs font-mono mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
          SYSTEM ONLINE &mdash; OSV DATABASE CONNECTED
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
          <span className="text-gray-400 font-mono text-base sm:text-lg block mb-2">
            <span className="text-accent">$</span> ./scan --dependencies
          </span>
          <span className="relative inline-block mt-2">
            <span data-text="YOUR DEPENDENCIES" className="glitch-wrapper">
              <span className="bg-gradient-to-r from-accent via-emerald-400 to-accent bg-clip-text text-transparent">
                YOUR DEPENDENCIES
              </span>
            </span>
          </span>
          <br />
          <span className="text-white/90">EXPOSED OR SECURE?</span>
        </h1>

        <div className="mt-6 inline-block">
          <span className="text-gray-500 font-mono text-sm">
            <span className="text-accent">$</span>{" "}
            <span className="typewrite">
              scanning package.json against 300k+ vulnerabilities...
            </span>
            <span className="animate-blink text-accent">_</span>
          </span>
        </div>

        <p className="mt-6 text-base text-gray-500 max-w-2xl mx-auto leading-relaxed font-mono text-sm">
          <span className="text-gray-600">//</span> Paste your <span className="text-accent">package.json</span> below
          and we'll cross-reference every dependency against the{" "}
          <span className="text-white/70">Open Source Vulnerabilities</span> database.
          Severity-graded. Real-time. No sign-up required.
        </p>

        <div className="mt-10 flex flex-wrap justify-center gap-3 text-xs font-mono text-gray-500">
          {["NO_API_KEY", "NPM_ECOSYSTEM", "REALTIME_OSV", "LOCK_FILE_SUPPORT"].map((tag, i) => (
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
