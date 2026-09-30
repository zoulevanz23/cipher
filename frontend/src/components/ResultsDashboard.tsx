import { useState } from "react";
import type { ScanResult, Severity } from "../types";

const order: Record<string, number> = { CRITICAL:4, HIGH:3, MEDIUM:2, LOW:1, NONE:0, UNKNOWN:-1 };

function sevColor(sev: string): string {
  if (sev === "CRITICAL") return "var(--crit)";
  if (sev === "HIGH") return "var(--high)";
  if (sev === "MEDIUM") return "var(--warn)";
  return "var(--pass)";
}

function sevBorder(sev: string): string {
  if (sev === "CRITICAL") return "rgba(255,92,92,.4)";
  if (sev === "HIGH") return "rgba(255,138,92,.4)";
  if (sev === "MEDIUM") return "rgba(245,196,83,.4)";
  return "rgba(57,217,138,.4)";
}

export function ResultsDashboard({ results, onSelectResult }: { results: ScanResult[]; onSelectResult?: (r: ScanResult|null)=>void }) {
  const [filter, setFilter] = useState<Severity|"ALL">("ALL");
  const [sortBy, setSortBy] = useState<"severity"|"name">("severity");
  const sorted=[...results].sort((a,b)=> sortBy==="severity"?(order[b.max_severity]??0)-(order[a.max_severity]??0):a.package.name.localeCompare(b.package.name));
  const filtered=filter==="ALL"?sorted:sorted.filter(r=>r.max_severity===filter);
  const vuln=results.filter(r=>r.vulnerable);
  return (
    <div>
      <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", gap:"12px", marginBottom:"16px", flexWrap:"wrap"}}>
        <h2 style={{fontFamily:"var(--font-sans)", fontSize:"18px", fontWeight:600, color:"var(--ink)"}}>
          {vuln.length?`${vuln.length} package${vuln.length>1?"s":""} with vulnerabilities`:"All packages safe"}
        </h2>
        <div style={{display:"flex", alignItems:"center", gap:"8px"}}>
          <select value={filter} onChange={e=>setFilter(e.target.value as any)} style={{fontFamily:"var(--font-mono)", fontSize:"13px", background:"var(--bg2)", color:"var(--ink)", border:"1px solid var(--line)", borderRadius:"4px", padding:"4px 8px"}}>
            <option value="ALL">All severities</option><option value="CRITICAL">Critical</option><option value="HIGH">High</option><option value="MEDIUM">Medium</option><option value="LOW">Low</option>
          </select>
          <button onClick={()=>setSortBy(sortBy==="severity"?"name":"severity")} className="btn btn-sm">Sort by {sortBy==="severity"?"name":"severity"}</button>
        </div>
      </div>
      <div style={{border:"1px solid var(--line)", borderRadius:"8px", overflow:"hidden"}}>
        {filtered.map((r,i)=>(
          <button key={`${r.package.name}-${i}`} onClick={()=>onSelectResult?.(r)} style={{width:"100%", display:"flex", alignItems:"center", gap:"12px", padding:"10px 12px", borderBottom:"1px solid var(--line)", background:"transparent", color:"var(--ink)", cursor:"pointer", textAlign:"left", transition:`background var(--dur-base) var(--ease)`}}
            onMouseEnter={(e)=>{e.currentTarget.style.background="rgba(255,255,255,.02)"}} onMouseLeave={(e)=>{e.currentTarget.style.background="transparent"}}>
            <span style={{width:"8px", height:"8px", borderRadius:"50%", background:sevColor(r.max_severity), flexShrink:0}} />
            <span style={{flex:"1", fontFamily:"var(--font-mono)", fontSize:"14px", fontWeight:500}}>{r.package.name}<span style={{color:"var(--muted)", fontWeight:400}}> {r.package.version}</span></span>
            <span style={{fontFamily:"var(--font-mono)", fontSize:"12px", color:"var(--muted)"}}>{r.package.ecosystem ?? ""}</span>
            <span style={{fontFamily:"var(--font-mono)", fontSize:"12px", fontWeight:600, color:sevColor(r.max_severity), border:`1px solid ${sevBorder(r.max_severity)}`, borderRadius:"4px", padding:"2px 6px", background:"transparent"}}>{r.max_severity}</span>
            <span style={{fontFamily:"var(--font-mono)", fontSize:"13px", color:"var(--muted)", width:"40px", textAlign:"right"}}>{r.vulnerabilities.length}</span>
          </button>
        ))}
        {filtered.length===0&&<div style={{textAlign:"center", padding:"32px", fontFamily:"var(--font-mono)", fontSize:"13px", color:"var(--muted)"}}>No results match filter.</div>}
      </div>
    </div>
  );
}
