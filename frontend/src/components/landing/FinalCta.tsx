import { HeroGraph } from "./HeroGraph";

/* Final CTA: full-width band bookending the page with the same
   low-opacity graph texture, slowed down. Verdict-style headline. */

export function FinalCta({ onRunScan }: { onRunScan: () => void }) {
  return (
    <section className="lp-breakout" style={{ position: "relative", overflow: "hidden", borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)", background: "var(--bg2)" }}>
      <HeroGraph opacity={0.08} slow />
      <div className="lp-inner" style={{ position: "relative", textAlign: "center", paddingTop: "64px", paddingBottom: "64px" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "14px", fontWeight: 600, color: "var(--pass)", letterSpacing: "0.06em", marginBottom: "12px" }}>✓ READY TO SCAN</div>
        <h2 style={{ fontFamily: "var(--font-sans)", fontSize: "clamp(24px, 3vw, 32px)", fontWeight: 700, color: "var(--ink)", margin: "0 0 12px" }}>Ship it knowing what's inside.</h2>
        <p style={{ fontFamily: "var(--font-sans)", fontSize: "15px", color: "var(--muted)", margin: "0 0 24px" }}>23 free scans a day. No signup until you want history.</p>
        <button onClick={onRunScan} className="btn btn-primary btn-sweep" style={{ fontSize: "14px", padding: "10px 28px" }}>Run Free Scan</button>
      </div>
    </section>
  );
}
