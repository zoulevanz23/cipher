import { useCountUp, useInView } from "./hooks";
import { useEffect, useState } from "react";

/* Stats bar: one hairline-divided row (terminal status bar, not cards).
   Numbers tick up fast (~600ms linear) on scroll-into-view with a
   filling underline on the same trigger. */

function Cell({ label, value, sub, start }: { label: string; value: number; sub: string; start: boolean }) {
  const n = useCountUp(value, start);
  return (
    <div style={{ flex: 1, minWidth: "140px", padding: "16px" }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--muted)", letterSpacing: "0.06em" }}>{label}</div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: "30px", fontWeight: 700, color: "var(--ink)", marginTop: "4px" }}>{n}</div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--muted)", marginTop: "4px" }}>{sub}</div>
      <div className={`stat-underline${start ? " fill" : ""}`}><span /></div>
    </div>
  );
}

export function StatsBar() {
  const { ref, inView } = useInView<HTMLDivElement>(0.4);
  const [starts, setStarts] = useState([false, false, false, false]);
  useEffect(() => {
    if (!inView) { setStarts([false, false, false, false]); return; }
    const timers = [0, 1, 2, 3].map((i) => window.setTimeout(() => setStarts((s) => { const n = [...s]; n[i] = true; return n; }), i * 80));
    return () => timers.forEach(clearTimeout);
  }, [inView]);
  return (
    <div ref={ref} style={{ border: "1px solid var(--line)", borderRadius: "4px", display: "flex", flexWrap: "wrap", overflow: "hidden" }}>
      <Cell label="ECOSYSTEMS" value={7} sub="npm · pip · Go · Maven · NuGet · RubyGems · Cargo" start={starts[0]} />
      <div style={{ width: "1px", background: "var(--line)" }} />
      <Cell label="SOURCES" value={3} sub="OSV.dev · NVD · GHSA" start={starts[1]} />
      <div style={{ width: "1px", background: "var(--line)" }} />
      <Cell label="FREE SCANS / DAY" value={5} sub="anonymous, no signup" start={starts[2]} />
      <div style={{ width: "1px", background: "var(--line)" }} />
      <Cell label="EXPORT FORMATS" value={4} sub="SPDX · CycloneDX · SARIF · CSV" start={starts[3]} />
    </div>
  );
}
