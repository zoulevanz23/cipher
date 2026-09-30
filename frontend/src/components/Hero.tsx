export function Hero() {
  return (
    <section style={{marginBottom:"24px"}}>
      <h1 style={{fontFamily:"var(--font-sans)", fontSize:"clamp(28px, 3.4vw, 36px)", fontWeight:600, color:"var(--ink)", lineHeight:1.2, marginBottom:"12px"}}>
        Cipher resolves your dependency tree and checks every package before you ship it.
      </h1>
      <p style={{fontFamily:"var(--font-sans)", fontSize:"16px", color:"var(--muted)", lineHeight:1.7, marginBottom:"24px"}}>
        A manifest goes in — <code style={{background:"var(--bg2)", padding:"2px 6px", borderRadius:"4px"}}>package.json</code>, <code style={{background:"var(--bg2)", padding:"2px 6px", borderRadius:"4px"}}>requirements.txt</code>, <code style={{background:"var(--bg2)", padding:"2px 6px", borderRadius:"4px"}}>go.mod</code>. Cipher queries OSV.dev, NVD, GHSA concurrently.
      </p>
      <div className="panel" style={{marginBottom:"24px"}}>
        <div className="panel-header">Scan Pipeline</div>
        <div style={{display:"flex", alignItems:"center", gap:"8px", flexWrap:"wrap", fontFamily:"var(--font-mono)", fontSize:"13px", color:"var(--muted)"}}>
          <span style={{color:"var(--pass)"}}>MANIFEST</span>
          <span style={{color:"var(--muted2)"}}>→</span>
          <span>PARSER</span>
          <span style={{color:"var(--muted2)"}}>→</span>
          <span style={{color:"var(--pass)"}}>OSV.DEV</span>
          <span style={{color:"var(--muted2)"}}>·</span>
          <span style={{color:"var(--pass)"}}>NVD</span>
          <span style={{color:"var(--muted2)"}}>·</span>
          <span style={{color:"var(--pass)"}}>GHSA</span>
          <span style={{color:"var(--muted2)"}}>→</span>
          <span style={{color:"var(--crit)"}}>CVSS GRADING</span>
          <span style={{color:"var(--muted2)"}}>→</span>
          <span style={{color:"var(--pass)"}}>OUTPUT</span>
        </div>
      </div>
      <div style={{display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"16px", borderTop:"1px solid var(--line)", paddingTop:"16px"}}>
        <div><div style={{fontFamily:"var(--font-mono)", fontSize:"26px", fontWeight:700, color:"var(--ink)"}}>300k+</div><div style={{fontFamily:"var(--font-sans)", fontSize:"13px", color:"var(--muted)", marginTop:"4px"}}>vulnerabilities indexed live</div></div>
        <div><div style={{fontFamily:"var(--font-mono)", fontSize:"26px", fontWeight:700, color:"var(--ink)"}}>20</div><div style={{fontFamily:"var(--font-sans)", fontSize:"13px", color:"var(--muted)", marginTop:"4px"}}>concurrent OSV queries</div></div>
        <div><div style={{fontFamily:"var(--font-mono)", fontSize:"26px", fontWeight:700, color:"var(--ink)"}}>7</div><div style={{fontFamily:"var(--font-sans)", fontSize:"13px", color:"var(--muted)", marginTop:"4px"}}>ecosystems supported</div></div>
        <div><div style={{fontFamily:"var(--font-mono)", fontSize:"26px", fontWeight:700, color:"var(--ink)"}}>5min</div><div style={{fontFamily:"var(--font-sans)", fontSize:"13px", color:"var(--muted)", marginTop:"4px"}}>advisory feed cache TTL</div></div>
      </div>
    </section>
  );
}
