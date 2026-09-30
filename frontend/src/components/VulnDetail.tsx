import { useState } from "react";
import type { ScanResult, Vulnerability, FixSuggestion } from "../types";

const col: Record<string,string> = { CRITICAL:"var(--crit)", HIGH:"var(--high)", MEDIUM:"var(--warn)", LOW:"var(--pass)" };

export function VulnDetail({ result, onClose, fix }: { result: ScanResult; onClose:()=>void; fix?:FixSuggestion }) {
  return (
    <div className="fixed inset-0 z-[70]">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl max-h-[85vh] overflow-y-auto bg-[var(--bg2)] border border-[var(--line)]">
        <div className="sticky top-0 bg-[var(--bg2)] border-b border-[var(--line)] flex items-start justify-between p-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 style={{fontFamily:"var(--font-sans)", fontSize:"16px", fontWeight:600, color:"var(--ink)"}}>{result.package.name}</h3>
              {result.package.ecosystem && <span style={{fontFamily:"var(--font-mono)", fontSize:"10px", border:"1px solid var(--line)", padding:"2px 6px", color:"var(--muted)"}}>{result.package.ecosystem}</span>}
              {result.package.license && result.package.license!=="Unknown" && <span style={{fontFamily:"var(--font-mono)", fontSize:"10px", border:"1px solid var(--line)", padding:"2px 6px", color:"var(--muted)"}}>{result.package.license}</span>}
            </div>
            <p style={{fontFamily:"var(--font-mono)", fontSize:"12px", color:"var(--muted)", marginTop:"4px"}}>{result.package.version}{result.health_score!==undefined && <span style={{marginLeft:"12px"}}>health: <span style={{color: result.health_score>=80?"var(--pass)":result.health_score>=50?"var(--high)":"var(--crit)"}}>{result.health_score}/100</span></span>}</p>
          </div>
          <button onClick={onClose} style={{width:"28px", height:"28px", border:"1px solid var(--line)", display:"flex", alignItems:"center", justifyContent:"center", background:"transparent", color:"var(--muted)", cursor:"pointer"}}>✕</button>
        </div>
        <div style={{padding:"16px", display:"flex", flexDirection:"column", gap:"16px"}}>
          {fix && (
            <div style={{border:"1px solid var(--pass)", background:"rgba(57,217,138,.05)", padding:"12px", borderRadius:"6px"}}>
              <p style={{fontFamily:"var(--font-mono)", fontSize:"11px", fontWeight:600, color:"var(--pass)"}}>Recommended Fix {fix.risk && <span style={{marginLeft:"8px", border:"1px solid var(--line)", padding:"1px 6px", color:"var(--muted)", fontSize:"10px"}}>{fix.risk_label||fix.risk}</span>}</p>
              <div style={{fontFamily:"var(--font-mono)", fontSize:"12px", marginTop:"8px", display:"flex", alignItems:"center", gap:"8px"}}>
                <span style={{textDecoration:"line-through", color:"var(--crit)"}}>{fix.current_version}</span> → <span style={{fontWeight:600, color:"var(--pass)"}}>{fix.recommended_version}</span>
              </div>
              <code style={{display:"block", marginTop:"8px", background:"var(--bg)", border:"1px solid var(--line)", padding:"6px 8px", fontSize:"12px", fontFamily:"var(--font-mono)", borderRadius:"4px"}}>npm install {result.package.name}@{fix.recommended_version}</code>
            </div>
          )}
          {result.vulnerabilities.length===0 ? (
            <div style={{padding:"24px", textAlign:"center", border:"1px solid var(--pass)", background:"rgba(57,217,138,.05)", borderRadius:"6px"}}>
              <p style={{fontWeight:600, color:"var(--pass)", fontFamily:"var(--font-mono)", fontSize:"13px"}}>No known vulnerabilities</p>
              <p style={{fontFamily:"var(--font-mono)", fontSize:"12px", color:"var(--muted)", marginTop:"4px"}}>This package version appears safe.</p>
            </div>
          ) : result.vulnerabilities.map(v=><VulnCard key={v.id} vuln={v} />)}
        </div>
      </div>
    </div>
  );
}

function VulnCard({ vuln }: { vuln: Vulnerability }) {
  const [open,setOpen]=useState(false);
  return (
    <div style={{border:"1px solid var(--line)", background:"var(--bg)"}}>
      <button onClick={()=>setOpen(!open)} style={{width:"100%", display:"flex", alignItems:"start", justifyContent:"space-between", gap:"12px", padding:"12px", textAlign:"left", background:"transparent", color:"var(--ink)", cursor:"pointer", border:"none"}}>
        <div style={{minWidth:"0", flex:"1"}}>
          <div style={{display:"flex", alignItems:"center", gap:"6px", flexWrap:"wrap"}}>
            <span style={{fontFamily:"var(--font-mono)", fontSize:"10px", fontWeight:600, padding:"2px 6px", background:col[vuln.severity]??`var(--muted)`, color:"#fff", borderRadius:"3px"}}>{vuln.severity}</span>
            <span style={{fontFamily:"var(--font-mono)", fontSize:"10px", border:"1px solid var(--line)", padding:"2px 6px", color:"var(--muted)"}}>{(vuln.source||"osv").toUpperCase()}</span>
            <span style={{fontFamily:"var(--font-mono)", fontSize:"12px", fontWeight:500}}>{vuln.id}</span>
            {vuln.cvss_score!=null && <span style={{fontFamily:"var(--font-mono)", fontSize:"10px", border:"1px solid var(--line)", padding:"2px 6px", color:"var(--muted)"}}>CVSS {vuln.cvss_score.toFixed(1)}</span>}
          </div>
          <p style={{fontFamily:"var(--font-sans)", fontSize:"13px", color:"var(--muted)", marginTop:"8px", lineHeight:1.5}}>{vuln.summary}</p>
        </div>
        <span style={{fontFamily:"var(--font-mono)", fontSize:"12px", color:"var(--muted)"}}>{open?"−":"+"}</span>
      </button>
      {open && (
        <div style={{borderTop:"1px solid var(--line)", padding:"12px", display:"flex", flexDirection:"column", gap:"8px", background:"var(--bg)"}}>
          {vuln.aliases.length>0 && <div style={{display:"flex", flexWrap:"wrap", gap:"4px"}}>{vuln.aliases.map(a=><span key={a} style={{fontFamily:"var(--font-mono)", fontSize:"10px", border:"1px solid var(--line)", background:"var(--bg2)", padding:"2px 6px", color:"var(--muted)"}}>{a}</span>)}</div>}
          <p style={{fontFamily:"var(--font-sans)", fontSize:"13px", color:"var(--muted)", lineHeight:1.5}}>{vuln.summary}</p>
          {vuln.references.length>0 && <div style={{display:"flex", flexDirection:"column", gap:"4px"}}>{vuln.references.slice(0,3).map((r,i)=><a key={i} href={r.url} target="_blank" rel="noopener noreferrer" style={{fontFamily:"var(--font-mono)", fontSize:"12px", color:"var(--muted)", textDecoration:"underline"}}>{r.url}</a>)}</div>}
        </div>
      )}
    </div>
  );
}
