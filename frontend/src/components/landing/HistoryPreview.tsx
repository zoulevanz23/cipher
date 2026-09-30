/* Scan-history preview: minimal severity-over-time line chart.
   Terminal sparkline — thin strokes, hairline axis, mono labels.
   Layout: chart fills left, live delta on right so panel never
   feels empty. References the real SQLite-backed history. */

const SERIES: Array<{ key: string; color: string; pts: number[] }> = [
  { key: "critical", color: "var(--crit)", pts: [3, 3, 2, 2, 1, 1, 0, 0] },
  { key: "high", color: "var(--high)", pts: [6, 5, 5, 4, 3, 3, 2, 1] },
  { key: "medium", color: "var(--warn)", pts: [9, 8, 9, 7, 6, 5, 5, 4] },
  { key: "low", color: "var(--pass)", pts: [4, 4, 3, 3, 2, 2, 1, 1] },
];
const DATES = ["03/12", "03/26", "04/09", "04/23", "05/07", "05/21", "06/04", "06/18"];

const W = 560, H = 140, PAD = { l: 28, r: 12, t: 10, b: 22 };

export function HistoryPreview() {
  const max = 10;
  const X = (i: number) => PAD.l + (i / (DATES.length - 1)) * (W - PAD.l - PAD.r);
  const Y = (v: number) => PAD.t + (H - PAD.t - PAD.b) * (1 - v / max);
  return (
    <section>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--muted)", letterSpacing: "0.06em", marginBottom: "8px" }}>HISTORY</div>
      <h2 style={{ fontFamily: "var(--font-sans)", fontSize: "24px", fontWeight: 700, color: "var(--ink)", margin: "0 0 8px" }}>Every scan, on record.</h2>
      <p style={{ fontFamily: "var(--font-sans)", fontSize: "14px", color: "var(--muted)", margin: "0 0 20px", lineHeight: 1.6 }}>
        SQLite-backed history with severity trends, vulnerability aging, and fix velocity — proof your tree is getting healthier.
      </p>
      <div className="history-panel" style={{ border: "1px solid var(--line)", borderRadius: "4px", background: "var(--bg2)", padding: "14px 16px", display: "grid", gridTemplateColumns: "1fr 184px", gap: "16px" }}>
        {/* Chart — fills column, no maxHeight cap */}
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", marginBottom: "8px" }}>
            {SERIES.map((s) => (
              <span key={s.key} style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                <span style={{ color: s.color }}>—</span> {s.key}
              </span>
            ))}
          </div>
          <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }} role="img" aria-label="Severity counts trending down over eight scans">
            {/* hairline grid */}
            {[0, 5, 10].map((v) => (
              <line key={v} x1={PAD.l} y1={Y(v)} x2={W - PAD.r} y2={Y(v)} stroke="var(--line)" strokeWidth={0.5} opacity={0.6} />
            ))}
            <line x1={PAD.l} y1={H - PAD.b} x2={W - PAD.r} y2={H - PAD.b} stroke="var(--line)" strokeWidth={1} />
            <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={H - PAD.b} stroke="var(--line)" strokeWidth={1} />
            {[0, 5, 10].map((v) => (
              <text key={v} x={PAD.l - 6} y={Y(v) + 3} textAnchor="end" fill="var(--muted2)" fontSize={8} fontFamily="var(--font-mono)">{v}</text>
            ))}
            {SERIES.map((s) => (
              <polyline key={s.key} points={s.pts.map((v, i) => `${X(i)},${Y(v)}`).join(" ")} fill="none" stroke={s.color} strokeWidth={1.35} strokeLinejoin="round" strokeLinecap="round" />
            ))}
            {DATES.map((d, i) => (
              i % 2 === 0 ? <text key={d} x={X(i)} y={H - 6} textAnchor="middle" fill="var(--muted2)" fontSize={8} fontFamily="var(--font-mono)">{d}</text> : null
            ))}
          </svg>
        </div>
        {/* Right — terminal delta, fills the dead space */}
        <div style={{ borderLeft: "1px solid var(--line)", paddingLeft: "16px", display: "flex", flexDirection: "column", gap: "10px", justifyContent: "center" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--muted)", letterSpacing: "0.06em" }}>8 SCANS · 12 WK</div>
          {SERIES.map((s) => {
            const a = s.pts[0], b = s.pts[s.pts.length - 1];
            const delta = b - a;
            return (
              <div key={s.key} style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "8px" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--muted)", textTransform: "uppercase" }}><span style={{ color: s.color }}>●</span> {s.key}</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--ink)", whiteSpace: "nowrap" }}>{a} <span style={{ color: "var(--muted2)" }}>→</span> {b} <span style={{ color: delta <= 0 ? "var(--pass)" : "var(--crit)", fontSize: "10px" }}>{delta <= 0 ? `${delta}` : `+${delta}`}</span></span>
              </div>
            );
          })}
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--muted2)", marginTop: "4px", lineHeight: 1.5 }}>Fix velocity accelerating.<br />Oldest open: 14d</div>
        </div>
      </div>
      <style>{`@media (max-width: 700px) { .history-panel { grid-template-columns: 1fr !important; } .history-panel > div:last-child { border-left: none !important; border-top: 1px solid var(--line); padding-left: 0 !important; padding-top: 12px; } }`}</style>
    </section>
  );
}
