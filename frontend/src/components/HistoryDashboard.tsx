import { useState, useEffect } from "react";
import { TrendChart } from "./TrendChart";
import { VulnAging } from "./VulnAging";
import { FixVelocity } from "./FixVelocity";

interface HistoryEntry {
  id: number;
  timestamp: string;
  project_name: string;
  total_packages: number;
  vulnerable_packages: number;
  total_vulnerabilities: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

const BASE = "/api";
const PER_PAGE = 10;

export function HistoryDashboard({ onLoad }: { onLoad?: (id: number) => void }) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem("vulnchecker_token");
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    fetch(`${BASE}/scan/history?limit=50`, { headers })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => { setHistory(Array.isArray(data) ? data : []); setPage(0); })
      .catch(() => { setHistory([]); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{fontFamily:"var(--font-mono)", fontSize:"13px", color:"var(--muted)", padding:"16px"}}>Loading history…</div>;
  if (history.length === 0) return <div style={{fontFamily:"var(--font-mono)", fontSize:"13px", color:"var(--muted)", padding:"16px"}}>No scan history yet.</div>;

  const totalPages = Math.ceil(history.length / PER_PAGE);
  const pageData = history.slice(page * PER_PAGE, (page + 1) * PER_PAGE);

  return (
    <div style={{display:"flex", flexDirection:"column", gap:"24px"}}>
      <TrendChart history={pageData} />

      <div style={{border:"1px solid var(--line)", borderRadius:"8px", overflow:"hidden"}}>
        <div style={{padding:"12px 16px", borderBottom:"1px solid var(--line)", display:"flex", alignItems:"center", justifyContent:"space-between"}}>
          <h4 style={{fontFamily:"var(--font-mono)", fontSize:"12px", color:"var(--ink)"}}>Scan History</h4>
          <span style={{fontFamily:"var(--font-mono)", fontSize:"11px", color:"var(--muted)"}}>{history.length} scans</span>
        </div>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%", borderCollapse:"collapse", fontFamily:"var(--font-mono)", fontSize:"12px"}}>
            <thead>
              <tr style={{borderBottom:"1px solid var(--line)"}}>
                {["Date","Project","Packages","Vuln","C","H","M","L"].map(h=>(
                  <th key={h} style={{textAlign:"left", padding:"8px 12px", color:"var(--muted)", fontWeight:400, fontSize:"11px"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageData.map((h)=>(
                <tr key={h.id} onClick={()=>onLoad?.(h.id)} style={{borderBottom:"1px solid var(--line)", cursor:"pointer", background:"transparent"}}
                  onMouseEnter={(e)=>{e.currentTarget.style.background="rgba(255,255,255,.02)"}} onMouseLeave={(e)=>{e.currentTarget.style.background="transparent"}}>
                  <td style={{padding:"8px 12px", color:"var(--muted)"}}>{h.timestamp.slice(0,10)}</td>
                  <td style={{padding:"8px 12px", color:"var(--ink)"}}>{h.project_name||"-"}</td>
                  <td style={{padding:"8px 12px", textAlign:"center", color:"var(--muted)"}}>{h.total_packages}</td>
                  <td style={{padding:"8px 12px", textAlign:"center", color:h.vulnerable_packages>0?"var(--crit)":"var(--pass)"}}>{h.vulnerable_packages}</td>
                  <td style={{padding:"8px 12px", textAlign:"center", color:"var(--crit)"}}>{h.critical}</td>
                  <td style={{padding:"8px 12px", textAlign:"center", color:"var(--high)"}}>{h.high}</td>
                  <td style={{padding:"8px 12px", textAlign:"center", color:"var(--warn)"}}>{h.medium}</td>
                  <td style={{padding:"8px 12px", textAlign:"center", color:"var(--pass)"}}>{h.low}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{padding:"12px 16px", borderTop:"1px solid var(--line)", display:"flex", alignItems:"center", justifyContent:"center", gap:"12px"}}>
          <button onClick={()=>setPage((p)=>Math.max(0,p-1))} disabled={page===0} style={{fontFamily:"var(--font-mono)", fontSize:"12px", padding:"6px 12px", background:page===0?"var(--bg2)":"var(--line)", color:page===0?"var(--muted2)":"var(--ink)", border:"none", borderRadius:"4px", cursor:page===0?"not-allowed":"pointer", opacity:page===0?0.5:1}}>← prev</button>
          <span style={{fontFamily:"var(--font-mono)", fontSize:"11px", color:"var(--muted)"}}>{page*PER_PAGE+1}–{Math.min((page+1)*PER_PAGE,history.length)}</span>
          <button onClick={()=>setPage((p)=>Math.min(totalPages-1,p+1))} disabled={page>=totalPages-1} style={{fontFamily:"var(--font-mono)", fontSize:"12px", padding:"6px 12px", background:page>=totalPages-1?"var(--bg2)":"var(--line)", color:page>=totalPages-1?"var(--muted2)":"var(--ink)", border:"none", borderRadius:"4px", cursor:page>=totalPages-1?"not-allowed":"pointer", opacity:page>=totalPages-1?0.5:1}}>next →</button>
        </div>
      </div>

      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:"16px"}}>
        <VulnAging history={pageData} />
        <FixVelocity history={pageData} />
      </div>
    </div>
  );
}
