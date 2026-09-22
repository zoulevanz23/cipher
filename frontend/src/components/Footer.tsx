export function Footer({ onAbout }: { onAbout?: () => void }) {
  return (
    <footer className="border-t border-[#12181F] pt-10 pb-12 mt-10">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <h3 className="text-[11px] font-mono tracking-[0.04em] text-[#8593A1] font-semibold mb-3">RUN IT</h3>
          <div className="border border-[#12181F] bg-[#E3E9ED] px-3.5 py-2.5 font-mono text-xs mb-2"><span className="text-[#8593A1]">$</span> <b className="text-[#C1273B] font-semibold">cipher</b> --path . --format json --fail-on high</div>
          <div className="border border-[#12181F] bg-[#E3E9ED] px-3.5 py-2.5 font-mono text-xs"><span className="text-[#8593A1]">$</span> <b className="text-[#C1273B] font-semibold">cipher</b> --path . --format sarif &gt; results.sarif</div>
          <p className="text-xs font-mono text-[#4C5A67] mt-3">Also available as a FastAPI service, a VS Code extension, and via direct API.</p>
        </div>
        <div>
          <h3 className="text-[11px] font-mono tracking-[0.04em] text-[#8593A1] font-semibold mb-3">TECH STACK</h3>
          <ul className="text-xs font-mono text-[#4C5A67] space-y-1.5">
            <li>Python 3.10+ · httpx · FastAPI · uvicorn</li>
            <li>PyJWT · bcrypt</li>
            <li>React 19 · Vite 8 · Tailwind 4</li>
            <li>TypeScript 5.8 · VS Code 1.85</li>
          </ul>
        </div>
        <div>
          <h3 className="text-[11px] font-mono tracking-[0.04em] text-[#8593A1] font-semibold mb-3">SOURCES QUERIED</h3>
          <ul className="text-xs font-mono text-[#4C5A67] space-y-1.5">
            <li>OSV.dev — primary vulnerability index</li>
            <li>NVD — CVSS enrichment</li>
            <li>GitHub Advisory Database — ecosystem advisories</li>
          </ul>
          {onAbout && <button onClick={onAbout} className="mt-4 text-xs font-mono underline decoration-[#B7C3CB] hover:text-[#12181F]">About →</button>}
        </div>
      </div>
      <div className="mt-10 pt-4 border-t border-[#B7C3CB] flex flex-wrap justify-between gap-2 text-[11px] font-mono text-[#8593A1]">
        <span>END OF SHEET — CIPHER-001</span>
        <span>Cipher VulnChecker v0.1.0 · Josh Ivan Sartin</span>
      </div>
    </footer>
  );
}
