interface AboutProps { onClose: () => void; }

export function About({ onClose }: AboutProps) {
  if (!onClose) return null;
  return (
    <div className="modal-overlay open" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{maxWidth:"520px"}}>
        <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        <div style={{fontFamily:"var(--font-mono)", fontSize:"11px", color:"var(--muted)", letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:"16px"}}>// About Cipher</div>
        <div style={{display:"flex", flexDirection:"column", gap:"20px"}}>
          <div style={{border:"1px solid var(--line)", borderRadius:"6px", padding:"12px", background:"var(--bg)"}}>
            <div style={{fontFamily:"var(--font-mono)", fontSize:"11px", color:"var(--muted)", marginBottom:"8px"}}>// Creator</div>
            <div style={{display:"flex", alignItems:"center", gap:"10px", marginBottom:"8px"}}>
              <div style={{width:"36px", height:"36px", borderRadius:"50%", background:"var(--line)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"var(--font-mono)", fontSize:"14px", fontWeight:600, color:"var(--ink)"}}>J</div>
              <div>
                <div style={{fontFamily:"var(--font-sans)", fontSize:"13px", fontWeight:600, color:"var(--ink)"}}>Josh Ivan Sartin</div>
                <div style={{fontFamily:"var(--font-mono)", fontSize:"11px", color:"var(--muted)"}}>Software Engineer</div>
              </div>
            </div>
            <p style={{fontFamily:"var(--font-sans)", fontSize:"12px", color:"var(--muted)", lineHeight:1.6}}>Built to help developers secure their supply chain by catching vulnerable dependencies before they ship to production. Also available as a <span style={{color:"var(--pass)", fontFamily:"var(--font-mono)", fontSize:"12px"}}>pip install cipher</span> CLI — no server or browser needed.</p>
          </div>
          <div style={{border:"1px solid var(--line)", borderRadius:"6px", padding:"12px", background:"var(--bg)"}}>
            <div style={{fontFamily:"var(--font-mono)", fontSize:"11px", color:"var(--muted)", marginBottom:"8px"}}>// Data Source</div>
            <div style={{display:"flex", flexDirection:"column", gap:"8px"}}>
              {[["OSV.dev","Open Source Vulnerabilities — a distributed database of vulnerability entries for open source projects."],["NVD","National Vulnerability Database — the U.S. government repository of standards-based vulnerability data."],["GitHub Advisory Database","Security advisories for open source packages hosted on GitHub."]].map(([name,desc])=>(
                <div key={name} style={{display:"flex", alignItems:"start", gap:"8px"}}>
                  <span style={{fontFamily:"var(--font-mono)", fontSize:"11px", color:"var(--pass)", marginTop:"2px"}}>&gt;</span>
                  <div>
                    <div style={{fontFamily:"var(--font-sans)", fontSize:"12px", fontWeight:500, color:"var(--ink)"}}>{name}</div>
                    <div style={{fontFamily:"var(--font-sans)", fontSize:"11px", color:"var(--muted)", lineHeight:1.5}}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={{border:"1px solid var(--line)", borderRadius:"6px", padding:"12px", background:"var(--bg)"}}>
            <div style={{fontFamily:"var(--font-mono)", fontSize:"11px", color:"var(--muted)", marginBottom:"8px"}}>// Tech Stack</div>
            <div style={{fontFamily:"var(--font-mono)", fontSize:"12px", color:"var(--muted)", display:"grid", gridTemplateColumns:"1fr 1fr", gap:"4px 16px"}}>
              <span style={{color:"var(--muted)"}}>Backend:</span><span style={{color:"var(--ink)"}}>Python + FastAPI</span>
              <span style={{color:"var(--muted)"}}>Frontend:</span><span style={{color:"var(--ink)"}}>React + Vite</span>
              <span style={{color:"var(--muted)"}}>Scanner:</span><span style={{color:"var(--ink)"}}>OSV API + httpx</span>
              <span style={{color:"var(--muted)"}}>CLI:</span><span style={{color:"var(--ink)"}}>Python + Click</span>
            </div>
          </div>
          <div style={{textAlign:"center", paddingTop:"8px"}}>
            <div style={{fontFamily:"var(--font-mono)", fontSize:"10px", color:"var(--muted2)"}}>MIT License · 2026</div>
          </div>
        </div>
      </div>
    </div>
  );
}
