import { useInView, useStepSequence } from "./hooks";

/* Tiers teaser: two flat panels, no SaaS pricing cards. The
   Registered column gets a subtle --pass border accent only —
   deliberately NOT an animated border.
   Anonymous column resolves first (checkmarks top to bottom,
   ~80ms stagger), THEN Registered column resolves the same way
   — sequential, not parallel. */

function Row({ ok, text, show }: { ok: boolean; text: string; show: boolean }) {
  return (
    <div style={{ display: "flex", gap: "8px", alignItems: "flex-start", fontFamily: "var(--font-sans)", fontSize: "14px", color: "var(--muted)" }}>
      <span style={{ fontFamily: "var(--font-mono)", color: ok ? "var(--pass)" : "var(--muted2)" }}>{ok ? "✓" : "—"}</span>
      <span style={{ opacity: show ? 1 : 0, transition: "opacity 0ms" }}>{text}</span>
    </div>
  );
}

export function TiersTeaser() {
  const { ref, inView } = useInView<HTMLDivElement>(0.2);
  const ANON = 5, REG = 5;
  const step = useStepSequence(inView, ANON + REG, (i) => i * 80);
  const anonItems = ["No signup, no credit card", "Full verdict + severity grading", "SARIF / CSV export", "Scan history", "Unlimited scans"];
  const regItems = ["Everything in Anonymous", "Unlimited scans", "SQLite-backed scan history", "Trend charts, vuln aging, fix velocity", "Profile + saved preferences"];
  return (
    <section ref={ref} id="tiers" style={{ scrollMarginTop: "72px" }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--muted)", letterSpacing: "0.06em", marginBottom: "8px" }}>ACCESS</div>
      <h2 style={{ fontFamily: "var(--font-sans)", fontSize: "24px", fontWeight: 700, color: "var(--ink)", margin: "0 0 20px" }}>Scan now, sign up never (unless you want to).</h2>
      <div className="lp-cols-2">
        <div style={{ background: "var(--bg2)", border: "1px solid var(--line)", borderRadius: "4px", padding: "24px" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--muted)", marginBottom: "4px" }}>ANONYMOUS</div>
          <div style={{ fontFamily: "var(--font-sans)", fontSize: "20px", fontWeight: 700, color: "var(--ink)", marginBottom: "16px" }}>Free · 23 scans/day</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {anonItems.map((t, i) => <Row key={t} ok={i < 3} text={t} show={step > i} />)}
          </div>
        </div>
        <div style={{ background: "var(--bg2)", border: "1px solid rgba(57,217,138,.4)", borderRadius: "4px", padding: "24px" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--pass)", marginBottom: "4px" }}>REGISTERED</div>
          <div style={{ fontFamily: "var(--font-sans)", fontSize: "20px", fontWeight: 700, color: "var(--ink)", marginBottom: "16px" }}>Free · unlimited</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {regItems.map((t, i) => <Row key={t} ok text={t} show={step > ANON + i} />)}
          </div>
        </div>
      </div>
    </section>
  );
}
