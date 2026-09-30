import { HeroGraph } from "./HeroGraph";

function Chip({ code }: { code: string }) {
  return (
    <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--muted)", background: "var(--bg2)", border: "1px solid var(--line)", borderRadius: "4px", padding: "3px 9px", whiteSpace: "nowrap" }}>
      <code style={{ color: "var(--ink)" }}>{code}</code>
    </span>
  );
}

function HeroTerminal() {
  return (
    <div style={{ background: "var(--bg2)", border: "1px solid var(--line)", borderRadius: "8px", overflow: "hidden", boxShadow: "0 16px 48px rgba(0,0,0,0.5)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "10px 14px", borderBottom: "1px solid var(--line)", background: "var(--bg)" }}>
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--crit)", opacity: 0.9 }} />
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--warn)", opacity: 0.9 }} />
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--pass)", opacity: 0.9 }} />
        <span style={{ marginLeft: "10px", fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--muted2)" }}>cipher — package.json</span>
        <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--pass)", border: "1px solid rgba(57,217,138,.3)", borderRadius: "4px", padding: "1px 6px" }}>PASS · 2 vulns</span>
      </div>
      <div style={{ padding: "14px 16px", fontFamily: "var(--font-mono)", fontSize: "12px", lineHeight: 1.8 }}>
        <div><span style={{ color: "var(--pass)" }}>$</span> <span style={{ color: "var(--ink)" }}>cipher --path .</span> <span style={{ color: "var(--muted2)" }}>— 347 packages resolved</span></div>
        <div style={{ height: "8px" }} />
        <div style={{ display: "flex", justifyContent: "space-between", color: "var(--muted2)", fontSize: "10px", letterSpacing: "0.06em", borderBottom: "1px solid var(--line)", paddingBottom: "4px", marginBottom: "6px" }}>
          <span>PACKAGE</span><span>SEVERITY</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "var(--ink)" }}>lodash@4.17.20 <span style={{ color: "var(--muted2)" }}>→ qs</span></span>
          <span style={{ color: "var(--high)", border: "1px solid rgba(255,138,92,.4)", borderRadius: "4px", padding: "0 6px", fontSize: "11px" }}>HIGH · 7.4</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "var(--ink)" }}>qs@6.11.0</span>
          <span style={{ color: "var(--warn)", border: "1px solid rgba(245,196,83,.4)", borderRadius: "4px", padding: "0 6px", fontSize: "11px" }}>MED · 5.3</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "var(--ink)" }}>axios@1.6.0</span>
          <span style={{ color: "var(--pass)", fontSize: "11px" }}>✓ clean</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "var(--ink)" }}>react@18.2.0</span>
          <span style={{ color: "var(--pass)", fontSize: "11px" }}>✓ clean</span>
        </div>
        <div style={{ marginTop: "10px", borderTop: "1px solid var(--line)", paddingTop: "8px", display: "flex", gap: "12px", fontSize: "11px" }}>
          <span style={{ color: "var(--muted)" }}><span style={{ color: "var(--crit)" }}>●</span> 1 critical</span>
          <span style={{ color: "var(--muted)" }}><span style={{ color: "var(--high)" }}>●</span> 1 high</span>
          <span style={{ color: "var(--muted)" }}><span style={{ color: "var(--pass)" }}>●</span> 345 clean</span>
          <span style={{ marginLeft: "auto", color: "var(--muted2)" }}>0.8s</span>
        </div>
        <div style={{ marginTop: "8px", fontSize: "11px", color: "var(--muted2)" }}><span style={{ color: "var(--pass)" }}>$</span> cipher --fix <span style={{ color: "var(--muted2)" }}>→ npm install lodash@4.17.21</span> <span className="blink" style={{ color: "var(--pass)" }}>▌</span></div>
      </div>
    </div>
  );
}

export function LandingHero({ onRunScan }: { onRunScan: () => void }) {
  return (
    <section className="lp-breakout" style={{ position: "relative", overflow: "hidden" }}>
      <HeroGraph />
      <div className="lp-inner" style={{ position: "relative", display: "grid", gridTemplateColumns: "1.05fr 0.9fr", gap: "32px", alignItems: "center", paddingTop: "88px", paddingBottom: "80px" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-sans)", fontSize: "clamp(36px, 4.2vw, 52px)", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.05, color: "var(--ink)", margin: "0 0 18px" }}>
            Cipher resolves your dependency tree and audits every package before you ship it.
          </h1>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: "17px", color: "var(--muted)", lineHeight: 1.65, maxWidth: "560px", margin: "0 0 16px" }}>
            Vulnerability, license, and health scanning across 7 ecosystems, powered by OSV.dev, NVD, and the GitHub Advisory Database.
          </p>
          <p style={{ display: "flex", gap: "6px", flexWrap: "wrap", margin: "0 0 28px" }}>
            <Chip code="package.json" />
            <Chip code="requirements.txt" />
            <Chip code="go.mod" />
            <Chip code="Gemfile" />
            <Chip code="pom.xml" />
          </p>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <button onClick={onRunScan} className="btn btn-primary btn-sweep" style={{ fontSize: "15px", padding: "12px 26px", fontWeight: 600 }}>Run Free Scan</button>
            <a href="#cli" className="btn btn-sweep" style={{ textDecoration: "none", fontSize: "14px", padding: "12px 22px", fontFamily: "var(--font-mono)" }}>
              <span style={{ color: "var(--pass)" }}>$</span>&nbsp;cipher --help
            </a>
          </div>
        </div>
        <div style={{ position: "relative" }}>
          <div style={{ position: "absolute", inset: "-20px", background: "radial-gradient(ellipse at 50% 50%, rgba(57,217,138,0.07) 0%, transparent 70%)", pointerEvents: "none" }} />
          <div style={{ position: "relative" }}>
            <HeroTerminal />
          </div>
        </div>
      </div>
      <style>{`@media (max-width: 900px) { .lp-inner[style*="1.05fr 0.9fr"] { grid-template-columns: 1fr !important; padding-top: 56px !important; padding-bottom: 48px !important; } }`}</style>
    </section>
  );
}
