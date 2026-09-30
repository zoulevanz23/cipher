import { useInView } from "./hooks";
import { useEffect, useState } from "react";

/* Comparison: plain hairline table (not cards). Row hover gives a
   green left-border accent + --bg2 shift. Mono data cells, Inter
   row labels. Figures are realistic placeholders.
   Rows pop top-to-bottom at 100ms each (instant snap), cipher
   column color-snaps to real color 80ms after each row lands. */

const ROWS: Array<{ label: string; cipher: string; npm: string; dependabot: string; snyk: string; good?: boolean[] }> = [
  { label: "Ecosystems covered", cipher: "7", npm: "npm only", dependabot: "12+", snyk: "10+", good: [true, false, true, true] },
  { label: "Concurrent multi-source query", cipher: "OSV · NVD · GHSA", npm: "single registry", dependabot: "single feed", snyk: "proprietary DB", good: [true, false, false, false] },
  { label: "License scanning", cipher: "yes", npm: "no", dependabot: "no", snyk: "paid tiers", good: [true, false, false, false] },
  { label: "Health score (0–100 + A–F)", cipher: "yes", npm: "no", dependabot: "no", snyk: "priority score", good: [true, false, false, true] },
  { label: "SBOM export", cipher: "SPDX · CycloneDX", npm: "no", dependabot: "dependency graph", snyk: "yes", good: [true, false, false, true] },
  { label: "CI integration", cipher: "workflow + SARIF + fail-on", npm: "manual", dependabot: "native PRs", snyk: "yes", good: [true, false, true, true] },
  { label: "Free tier", cipher: "23 scans/day, no signup", npm: "free", dependabot: "free (public)", snyk: "trial", good: [true, true, true, false] },
];

export function ComparisonTable() {
  const { ref, inView } = useInView<HTMLDivElement>(0.2);
  const [rows, setRows] = useState<boolean[]>(ROWS.map(() => false));
  useEffect(() => {
    if (!inView) { setRows(ROWS.map(() => false)); return; }
    const timers = ROWS.map((_, i) => window.setTimeout(() => setRows((r) => { const n = [...r]; n[i] = true; return n; }), i * 100));
    return () => timers.forEach(clearTimeout);
  }, [inView]);
  return (
    <section ref={ref}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--muted)", letterSpacing: "0.06em", marginBottom: "8px" }}>COMPARE</div>
      <h2 style={{ fontFamily: "var(--font-sans)", fontSize: "24px", fontWeight: 700, color: "var(--ink)", margin: "0 0 20px" }}>Against the usual suspects.</h2>
      <div style={{ border: "1px solid var(--line)", borderRadius: "4px", overflowX: "auto" }}>
        <table className="lp-table" style={{ minWidth: "640px" }}>
          <thead>
            <tr style={{ background: "var(--bg2)" }}>
              <th style={{ fontFamily: "var(--font-sans)", fontSize: "13px", color: "var(--muted)" }}></th>
              <th style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--pass)" }}>cipher</th>
              <th style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--muted)" }}>npm audit</th>
              <th style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--muted)" }}>dependabot</th>
              <th style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--muted)" }}>snyk</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r, ri) => (
              <tr key={r.label} className={`row-pop${rows[ri] ? " visible" : ""}`} style={{ transitionDelay: `${rows[ri] ? 0 : ri * 100}ms` }}>
                <td style={{ fontFamily: "var(--font-sans)", fontSize: "13px", color: "var(--ink)" }}>{r.label}</td>
                {[r.cipher, r.npm, r.dependabot, r.snyk].map((v, i) => (
                  <td key={i} style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: i === 0 ? (rows[ri] ? "var(--pass)" : "var(--muted)") : (r.good?.[i] ? "var(--pass)" : "var(--muted)"), transition: `color 80ms ease-out ${rows[ri] ? 80 : 0}ms` }}>{v}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
