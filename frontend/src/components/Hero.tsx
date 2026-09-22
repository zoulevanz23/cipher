import { useEffect, useRef } from "react";

export function Hero() {
  const svgRef = useRef<SVGSVGElement>(null);
  const drawnRef = useRef(false);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || drawnRef.current) return;
    const paths = Array.from(svg.querySelectorAll<SVGPathElement>("[data-path]"));
    const nodes = Array.from(svg.querySelectorAll<SVGGElement>("[data-node]"));
    // initial state
    paths.forEach(p => {
      const len = p.getTotalLength();
      p.style.strokeDasharray = String(len);
      p.style.strokeDashoffset = String(len);
      (p as any).style.transition = "none";
    });
    nodes.forEach(n => { (n as HTMLElement).style.opacity = "0"; (n as any).style.transition = "none"; });

    const animate = (delayBase: number) => {
      if (drawnRef.current) return;
      drawnRef.current = true;
      paths.forEach((p, i) => {
        const len = p.getTotalLength();
        requestAnimationFrame(() => setTimeout(() => {
          p.style.transition = `stroke-dashoffset var(--dur-draw) var(--ease)`;
          p.style.strokeDashoffset = "0";
        }, delayBase + i * 90));
      });
      nodes.forEach((n, i) => {
        requestAnimationFrame(() => setTimeout(() => {
          (n as HTMLElement).style.transition = `opacity var(--dur-base) var(--ease)`;
          (n as HTMLElement).style.opacity = "1";
        }, delayBase + i * 110));
      });
    };

    // fire once when scrolled into view, then never again this session
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && !drawnRef.current) { animate(0); io.disconnect(); }
        });
      }, { threshold: 0.3 });
      io.observe(svg);
      // initial if already in view
      animate(200);
      return () => io.disconnect();
    } else {
      animate(200);
    }
  }, []);

  return (
    <section className="pt-10 sm:pt-14 pb-2">
      <div className="flex flex-wrap justify-between gap-6 items-end mb-6">
        <h1 className="font-[Space_Grotesk] font-bold text-[30px] sm:text-[42px] lg:text-[50px] leading-[1.08] max-w-[16ch] tracking-[-0.01em]">
          Cipher resolves your dependency tree and checks every package before you ship it.
        </h1>
        <p className="hidden lg:block max-w-[36ch] text-[13px] leading-7 text-[var(--ink-dim)] font-mono">
          A manifest goes in — <code className="bg-[var(--paper-2)] px-1">package.json</code>, <code className="bg-[var(--paper-2)] px-1">requirements.txt</code>, <code className="bg-[var(--paper-2)] px-1">go.mod</code>. Cipher queries OSV.dev, NVD, GHSA concurrently.
        </p>
      </div>
      <p className="lg:hidden text-[13px] leading-7 text-[var(--ink-dim)] font-mono max-w-[60ch] mb-6">
        A manifest goes in — <code>package.json</code>, <code>requirements.txt</code>, <code>go.mod</code>, or seven other formats. Cipher parses it, resolves exact versions from lock files, and queries OSV.dev, NVD, and the GitHub Advisory Database concurrently.
      </p>

      <div className="titleblock">
        <div className="tb-cell"><span className="l">DWG NO.</span><span className="v">CIPHER-001</span></div>
        <div className="tb-cell"><span className="l">REVISION</span><span className="v">v0.1.0</span></div>
        <div className="tb-cell"><span className="l">AUTHOR</span><span className="v">J. I. Sartin</span></div>
        <div className="tb-cell"><span className="l">INDEXED ADVISORIES</span><span className="v">300,412</span></div>
      </div>

      <div className="diagram-frame">
        <svg ref={svgRef} viewBox="0 0 920 220" role="img" aria-label="Scan pipeline">
          <path data-path d="M120,110 L170,110" className="flow-line" />
          <path data-path d="M280,110 L310,110 L310,40 L350,40" className="flow-line" />
          <path data-path d="M280,110 L350,110" className="flow-line" />
          <path data-path d="M280,110 L310,110 L310,185 L350,185" className="flow-line" />
          <path data-path d="M470,40 L500,40 L500,110 L540,110" className="flow-line" />
          <path data-path d="M470,110 L540,110" className="flow-line" />
          <path data-path d="M470,185 L500,185 L500,110 L540,110" className="flow-line" />
          <path data-path d="M670,110 L740,110" className="flow-line" />
          <g data-node><rect className="node-box" x="10" y="85" width="110" height="50"/><text className="node-label" x="65" y="106" textAnchor="middle">MANIFEST</text><text className="node-sub" x="65" y="122" textAnchor="middle">package.json</text></g>
          <g data-node><rect className="node-box" x="170" y="85" width="110" height="50"/><text className="node-label" x="225" y="106" textAnchor="middle">PARSER</text><text className="node-sub" x="225" y="122" textAnchor="middle">clean_version()</text></g>
          <g data-node><rect className="node-box" x="350" y="15" width="120" height="50"/><text className="node-label" x="410" y="36" textAnchor="middle">OSV.DEV</text><text className="node-sub" x="410" y="52" textAnchor="middle">primary index</text></g>
          <g data-node><rect className="node-box" x="350" y="85" width="120" height="50"/><text className="node-label" x="410" y="106" textAnchor="middle">NVD</text><text className="node-sub" x="410" y="122" textAnchor="middle">CVSS enrichment</text></g>
          <g data-node><rect className="node-box" x="350" y="160" width="120" height="50"/><text className="node-label" x="410" y="181" textAnchor="middle">GH ADVISORY</text><text className="node-sub" x="410" y="197" textAnchor="middle">ecosystem-specific</text></g>
          <g data-node><rect className="node-box accent" x="540" y="85" width="130" height="50"/><text className="node-label" x="605" y="106" textAnchor="middle">CVSS GRADING</text><text className="node-sub" x="605" y="122" textAnchor="middle">severity + health</text></g>
          <g data-node><rect className="node-box" x="740" y="85" width="150" height="50"/><text className="node-label" x="815" y="106" textAnchor="middle">OUTPUT</text><text className="node-sub" x="815" y="122" textAnchor="middle">fixes · SBOM · SARIF</text></g>
          <text className="flow-anno" x="410" y="8">MAX_CONCURRENT = 20</text>
        </svg>
      </div>
      <div className="diagram-caption">
        <span>scanner.py:11 — concurrent OSV query pool</span>
        <span>parser.py:1 — lock files win for exact versions</span>
      </div>

      <div className="stat-strip">
        <div className="stat-cell"><div className="n">300k+</div><div className="l">vulnerabilities indexed live</div></div>
        <div className="stat-cell"><div className="n">20</div><div className="l">concurrent OSV queries</div></div>
        <div className="stat-cell"><div className="n">7</div><div className="l">ecosystems supported</div></div>
        <div className="stat-cell"><div className="n">5min</div><div className="l">advisory feed cache TTL</div></div>
      </div>
    </section>
  );
}
