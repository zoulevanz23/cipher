import { useState } from "react";
import { useInViewEnter, usePrefersReducedMotion } from "./hooks";

/* "How a scan resolves": the product's real pipeline as an animated
   diagram. Connectors carry a traveling pulse that plays ONCE per
   viewport entry (a terminal process runs once and finishes — it does
   not loop forever). Click/tap a stage for a plain-English tooltip. */

const STAGES: Array<{ id: string; label: string; sub?: string; tip: string }> = [
  { id: "manifest", label: "MANIFEST", tip: "Your lockfile or manifest goes in — package.json, requirements.txt, go.mod, Gemfile, pom.xml, and more. Cipher parses the full tree including transitive dependencies." },
  { id: "parser", label: "PARSER", tip: "The parser normalizes names and versions across 7 ecosystems and resolves the dependency graph, so every nested package gets checked — not just your direct deps." },
  { id: "sources", label: "SOURCES", sub: "OSV.DEV · NVD · GHSA", tip: "Every package is queried concurrently against OSV.dev, the National Vulnerability Database, and the GitHub Advisory Database. Results are cached with a short TTL." },
  { id: "cvss", label: "CVSS GRADING", tip: "Matched advisories are graded by CVSS score into CRITICAL / HIGH / MEDIUM / LOW, so the worst findings sort to the top of your results." },
  { id: "health", label: "HEALTH SCORE", tip: "Each package also gets a 0–100 health score with an A–F grade from vulnerabilities, license risk, and maintenance status." },
  { id: "output", label: "OUTPUT", tip: "You get a verdict band, fix suggestions with upgrade-risk labels, and exports in SPDX, CycloneDX, SARIF, or CSV — plus a CI flag to fail the build on your threshold." },
];

function Connector({ on, color }: { on: boolean; color: string }) {
  return (
    <svg width="44" height="12" viewBox="0 0 44 12" style={{ flexShrink: 0 }} aria-hidden="true">
      <line x1="0" y1="6" x2="44" y2="6" stroke="var(--line)" strokeWidth={1} />
      {on && <line x1="0" y1="6" x2="44" y2="6" stroke={color} strokeWidth={1.5} className="pulse-dash" />}
    </svg>
  );
}

export function PipelineSection() {
  const [playKey, setPlayKey] = useState(0);
  const [selected, setSelected] = useState<string>("sources");
  const reduced = usePrefersReducedMotion();
  const ref = useInViewEnter<HTMLDivElement>(() => {
    if (reduced) return;
    setPlayKey((k) => k + 1);
  });
  const playing = playKey > 0;
  const active = STAGES.find((s) => s.id === selected);

  return (
    <section id="pipeline">
      <div style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--muted)", letterSpacing: "0.06em", marginBottom: "8px" }}>HOW A SCAN RESOLVES</div>
      <h2 style={{ fontFamily: "var(--font-sans)", fontSize: "24px", fontWeight: 700, color: "var(--ink)", margin: "0 0 20px" }}>One pipeline, every signal.</h2>
      <div ref={ref} key={playKey} style={{ border: "1px solid var(--line)", borderRadius: "4px", background: "var(--bg2)", padding: "20px 16px" }}>
        <div style={{ display: "flex", alignItems: "stretch", gap: "4px", flexWrap: "wrap" }}>
          {STAGES.map((s, i) => (
            <div key={s.id} style={{ display: "flex", alignItems: "center", gap: "4px", flex: "1 1 auto" }}>
              <button
                onClick={() => setSelected(s.id)}
                style={{
                  flex: 1, background: selected === s.id ? "var(--bg)" : "transparent",
                  border: `1px solid ${selected === s.id ? "var(--muted)" : "var(--line)"}`,
                  borderRadius: "4px", padding: "12px 8px", cursor: "pointer", minWidth: "110px",
                }}
              >
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "12px", fontWeight: 600, color: selected === s.id ? "var(--ink)" : "var(--muted)" }}>{s.label}</div>
                {s.sub && <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--pass)", marginTop: "4px" }}>{s.sub}</div>}
              </button>
              {i < STAGES.length - 1 && <Connector on={playing} color={s.id === "cvss" ? "var(--crit)" : "var(--pass)"} />}
            </div>
          ))}
        </div>
        {active && (
          <div style={{ marginTop: "16px", borderTop: "1px solid var(--line)", paddingTop: "12px", fontFamily: "var(--font-sans)", fontSize: "14px", color: "var(--muted)", lineHeight: 1.6 }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--pass)" }}>$ {active.label.toLowerCase()} --explain</span>
            <br />{active.tip}
          </div>
        )}
      </div>
    </section>
  );
}
