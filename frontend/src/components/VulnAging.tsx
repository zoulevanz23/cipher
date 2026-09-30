import { useMemo } from "react";

interface HistoryEntry {
  id: number;
  timestamp: string;
  results_json?: string;
}

interface Props { history: HistoryEntry[]; }

interface VulnAge {
  id: string;
  severity: string;
  package_name: string;
  first_seen: number;
  last_seen: number;
  scan_count: number;
  active: boolean;
}

const SEV_ORDER: Record<string, number> = { CRITICAL:4, HIGH:3, MEDIUM:2, LOW:1 };

export function VulnAging({ history }: Props) {
  const vulnAges = useMemo(() => {
    const sorted = [...history].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const vulnMap = new Map<string, VulnAge>();
    sorted.forEach((entry, scanIdx) => {
      if (!entry.results_json) return;
      try {
        const results = JSON.parse(entry.results_json);
        for (const result of results) {
          const pkgName = result.package?.name || "unknown";
          for (const vuln of result.vulnerabilities || []) {
            const key = `${vuln.id}::${pkgName}`;
            if (vulnMap.has(key)) {
              const existing = vulnMap.get(key)!;
              existing.last_seen = scanIdx;
              existing.scan_count++;
            } else {
              vulnMap.set(key, { id: vuln.id, severity: vuln.severity || "UNKNOWN", package_name: pkgName, first_seen: scanIdx, last_seen: scanIdx, scan_count: 1, active: true });
            }
          }
        }
      } catch {}
    });
    const latestIdx = sorted.length - 1;
    for (const v of vulnMap.values()) v.active = v.last_seen === latestIdx;
    return Array.from(vulnMap.values()).sort((a, b) => SEV_ORDER[b.severity] - SEV_ORDER[a.severity] || a.first_seen - b.first_seen);
  }, [history]);

  if (vulnAges.length === 0) {
    return (
      <div style={{border:"1px solid var(--line)", borderRadius:"8px", padding:"16px", background:"var(--bg2)"}}>
        <h4 style={{fontFamily:"var(--font-mono)", fontSize:"12px", color:"var(--ink)", fontWeight:600, marginBottom:"8px"}}>Vulnerability Aging</h4>
        <p style={{fontFamily:"var(--font-mono)", fontSize:"12px", color:"var(--muted)"}}>No vulnerability data in history.</p>
      </div>
    );
  }

  const active = vulnAges.filter((v) => v.active);
  const fixed = vulnAges.filter((v) => !v.active);
  const scanCount = history.length;

  return (
    <div style={{border:"1px solid var(--line)", borderRadius:"8px", padding:"16px", background:"var(--bg2)"}}>
      <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"12px", flexWrap:"wrap", gap:"8px"}}>
        <div>
          <h4 style={{fontFamily:"var(--font-mono)", fontSize:"12px", color:"var(--ink)", fontWeight:600}}>Vulnerability Aging</h4>
          <p style={{fontFamily:"var(--font-mono)", fontSize:"10px", color:"var(--muted)", marginTop:"2px"}}>Persistence across {scanCount} scan{scanCount !== 1 ? "s" : ""}</p>
        </div>
        <div style={{display:"flex", alignItems:"center", gap:"12px", fontFamily:"var(--font-mono)", fontSize:"10px", color:"var(--muted)"}}>
          <span style={{color:"var(--crit)"}}>{active.length} active</span>
          <span style={{color:"var(--pass)"}}>{fixed.length} fixed</span>
        </div>
      </div>
      <div style={{display:"flex", flexDirection:"column", gap:"4px", maxHeight:"200px", overflowY:"auto"}}>
        {vulnAges.slice(0, 25).map((v) => {
          const pct = Math.round((v.scan_count / Math.max(scanCount, 1)) * 100);
          return (
            <div key={`${v.id}::${v.package_name}`} style={{display:"flex", alignItems:"center", gap:"6px", fontFamily:"var(--font-mono)", fontSize:"10px", padding:"3px 0"}}>
              <span style={{width:"6px", height:"6px", borderRadius:"50%", background:v.active ? "var(--crit)" : "var(--pass)", flexShrink:0}} />
              <span style={{color:"var(--muted)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", flex:"1"}}>{v.package_name}</span>
              <span style={{color:"var(--muted)", width:"40px", textAlign:"right"}}>{v.id}</span>
              <div style={{width:"40px", height:"4px", background:"var(--bg)", borderRadius:"2px", overflow:"hidden", flexShrink:0}}>
                <div style={{width:`${pct}%`, height:"100%", background:v.active ? "var(--crit)" : "var(--pass)", borderRadius:"2px"}} />
              </div>
              <span style={{color:"var(--muted)", width:"28px", textAlign:"right"}}>{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
