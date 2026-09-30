/* Dependency Tree — compact, no scroll, no overlap.
   Hairline edges, mono labels. Flagged nodes use outlined pill
   language (status-color border + CVSS badge). Tight 70px level
   spacing so the whole tree fits in ~260px height. */

const NODES: Array<{ x: number; y: number; name: string; ver: string; sev?: "HIGH" | "MEDIUM"; cvss?: string }> = [
  { x: 300, y: 28, name: "cipher-app", ver: "1.4.0" },
  { x: 140, y: 100, name: "express", ver: "4.19.2" },
  { x: 300, y: 100, name: "react", ver: "18.2.0" },
  { x: 460, y: 100, name: "axios", ver: "1.6.0" },
  { x: 70, y: 172, name: "qs", ver: "6.11.0", sev: "MEDIUM", cvss: "5.3" },
  { x: 210, y: 172, name: "serve-static", ver: "1.15.0" },
  { x: 370, y: 172, name: "scheduler", ver: "0.23.0" },
  { x: 520, y: 172, name: "follow-redirects", ver: "1.15.0" },
  { x: 125, y: 242, name: "lodash", ver: "4.17.20", sev: "HIGH", cvss: "7.4" },
  { x: 440, y: 242, name: "debug", ver: "4.1.0" },
];
const EDGES: Array<[number, number]> = [[0, 1], [0, 2], [0, 3], [1, 4], [1, 5], [2, 6], [3, 7], [4, 8], [7, 9]];

const SEVC: Record<string, string> = { HIGH: "var(--high)", MEDIUM: "var(--warn)" };

export function TreeVisual() {
  return (
    <section>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--muted)", letterSpacing: "0.06em", marginBottom: "6px" }}>TRANSITIVE DEPTH</div>
      <h2 style={{ fontFamily: "var(--font-sans)", fontSize: "22px", fontWeight: 700, color: "var(--ink)", margin: "0 0 12px" }}>The vuln is never where you look.</h2>
      <div style={{ display: "grid", gridTemplateColumns: "1.35fr 0.85fr", gap: "12px", alignItems: "start" }}>
        <div style={{ border: "1px solid var(--line)", borderRadius: "4px", background: "var(--bg2)", padding: "10px 8px 8px", overflow: "hidden" }}>
          <svg viewBox="0 0 600 268" style={{ width: "100%", height: "auto", maxHeight: "268px", display: "block" }} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Dependency tree with flagged transitive packages">
            {EDGES.map(([a, b], i) => (
              <line key={i} x1={NODES[a].x} y1={NODES[a].y + 13} x2={NODES[b].x} y2={NODES[b].y - 13} stroke="var(--line)" strokeWidth={1} opacity={0.9} />
            ))}
            {NODES.map((n, i) => (
              <g key={i}>
                <title>{`${n.name}@${n.ver}`}</title>
                <rect x={n.x - 54} y={n.y - 13} width={108} height={26} rx={4}
                  fill="var(--bg)" stroke={n.sev ? SEVC[n.sev] : "var(--line)"} strokeWidth={n.sev ? 1.4 : 1} />
                <text x={n.x} y={n.y + 4} textAnchor="middle" fill="var(--ink)" fontSize={10} fontFamily="var(--font-mono)">{n.name}</text>
                <text x={n.x} y={n.y - 17} textAnchor="middle" fill="var(--muted2)" fontSize={9} fontFamily="var(--font-mono)">{n.ver}</text>
                {n.sev && n.cvss && (
                  <g>
                    <rect x={n.x + 58} y={n.y - 11} width={32} height={16} rx={3} fill="var(--bg)" stroke={SEVC[n.sev]} strokeWidth={1} />
                    <text x={n.x + 74} y={n.y + 1} textAnchor="middle" fill={SEVC[n.sev]} fontSize={9} fontWeight={700} fontFamily="var(--font-mono)">{n.cvss}</text>
                  </g>
                )}
              </g>
            ))}
          </svg>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ border: "1px solid var(--line)", borderRadius: "4px", background: "var(--bg2)", padding: "12px 14px" }}>
            <div style={{ fontFamily: "var(--font-sans)", fontSize: "13px", fontWeight: 600, color: "var(--ink)", marginBottom: "4px" }}>Dependency Tree</div>
            <p style={{ fontFamily: "var(--font-sans)", fontSize: "13px", color: "var(--muted)", lineHeight: 1.6, margin: 0 }}>
              Your manifest lists a dozen packages; your lockfile hides hundreds. Cipher walks the full graph, so a
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--high)" }}> lodash@4.17.20 </span>
              three levels deep still surfaces — with its path, not just its name.
            </p>
          </div>
          <div style={{ border: "1px solid var(--line)", borderRadius: "4px", background: "var(--bg2)", padding: "12px 14px" }}>
            <div style={{ fontFamily: "var(--font-sans)", fontSize: "13px", fontWeight: 600, color: "var(--ink)", marginBottom: "4px" }}>Health Score, same pass</div>
            <p style={{ fontFamily: "var(--font-sans)", fontSize: "13px", color: "var(--muted)", lineHeight: 1.6, margin: 0 }}>
              Vulnerabilities are only one signal. Every node also carries a 0–100 score with an A–F grade from
              license risk and maintenance status — stale, unlicensed code glows before it breaks you.
            </p>
          </div>
        </div>
      </div>
      <style>{`@media (max-width: 860px) { div[style*="1.35fr 0.85fr"] { grid-template-columns: 1fr !important; } }`}</style>
    </section>
  );
}
