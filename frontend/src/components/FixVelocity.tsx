import { useMemo } from "react";

interface HistoryEntry {
  id: number;
  timestamp: string;
  fixes_json?: string;
  total_vulnerabilities: number;
}

interface Props { history: HistoryEntry[]; }

const RISK_COLORS: Record<string, string> = { safe:"var(--pass)", minor:"var(--warn)", major:"var(--crit)" };

export function FixVelocity({ history }: Props) {
  const scans = useMemo(() => {
    const sorted = [...history].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    return sorted.map((entry) => {
      let fixes: Array<{ risk?: string }> = [];
      if (entry.fixes_json) { try { fixes = JSON.parse(entry.fixes_json); } catch {} }
      const safe = fixes.filter((f) => f.risk === "safe").length;
      const minor = fixes.filter((f) => f.risk === "minor").length;
      const major = fixes.filter((f) => f.risk === "major").length;
      return { id: entry.id, date: entry.timestamp.slice(0, 10), total: fixes.length, safe, minor, major, vulns: entry.total_vulnerabilities };
    });
  }, [history]);

  if (scans.length === 0) {
    return (
      <div style={{border:"1px solid var(--line)", borderRadius:"8px", padding:"16px", background:"var(--bg2)"}}>
        <h4 style={{fontFamily:"var(--font-mono)", fontSize:"12px", color:"var(--ink)", fontWeight:600, marginBottom:"8px"}}>Fix Velocity</h4>
        <p style={{fontFamily:"var(--font-mono)", fontSize:"12px", color:"var(--muted)"}}>No fix data available.</p>
      </div>
    );
  }

  const maxTotal = Math.max(...scans.map((s) => s.total), 1);
  const totalSafe = scans.reduce((s, c) => s + c.safe, 0);
  const totalMinor = scans.reduce((s, c) => s + c.minor, 0);
  const totalMajor = scans.reduce((s, c) => s + c.major, 0);

  return (
    <div style={{border:"1px solid var(--line)", borderRadius:"8px", padding:"16px", background:"var(--bg2)"}}>
      <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"12px", flexWrap:"wrap", gap:"8px"}}>
        <div>
          <h4 style={{fontFamily:"var(--font-mono)", fontSize:"12px", color:"var(--ink)", fontWeight:600}}>Fix Velocity</h4>
          <p style={{fontFamily:"var(--font-mono)", fontSize:"10px", color:"var(--muted)", marginTop:"2px"}}>Fixes suggested per scan</p>
        </div>
        <div style={{display:"flex", alignItems:"center", gap:"8px", fontFamily:"var(--font-mono)", fontSize:"10px"}}>
          {(["safe", "minor", "major"] as const).map((risk) => {
            const count = risk === "safe" ? totalSafe : risk === "minor" ? totalMinor : totalMajor;
            if (count === 0) return null;
            return <span key={risk} style={{color:RISK_COLORS[risk]}}>{risk} {count}</span>;
          })}
        </div>
      </div>
      <div style={{display:"flex", flexDirection:"column", gap:"4px", maxHeight:"200px", overflowY:"auto"}}>
        {scans.map((scan) => {
          const barPct = (scan.total / maxTotal) * 100;
          return (
            <div key={scan.id} style={{display:"flex", alignItems:"center", gap:"6px"}}>
              <span style={{fontFamily:"var(--font-mono)", fontSize:"10px", color:"var(--muted)", width:"48px", flexShrink:0}}>{scan.date}</span>
              <div style={{flex:"1", height:"12px", background:"var(--bg)", borderRadius:"6px", overflow:"hidden", display:"flex", maxWidth:`${Math.max(barPct, 8)}%`}}>
                {(["safe", "minor", "major"] as const).map((risk) => {
                  const count = scan[risk];
                  if (count === 0) return null;
                  return <div key={risk} style={{width:`${(count / scan.total) * 100}%`, height:"100%", background:RISK_COLORS[risk]}} />;
                })}
              </div>
              <span style={{fontFamily:"var(--font-mono)", fontSize:"10px", color:"var(--muted)", width:"56px", flexShrink:0}}>
                {scan.total > 0 ? `${scan.total} fixes` : "—"}
                {scan.vulns > 0 && <span style={{color:"var(--muted2)"}}> · {scan.vulns}v</span>}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
