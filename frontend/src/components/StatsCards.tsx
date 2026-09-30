import type { ScanResponse } from "../types";

export function StatsCards({ summary }: { summary: ScanResponse["summary"] }) {
  const breakdown = summary.severity_breakdown;
  const stats = [
    { num: summary.total_packages, label: "packages scanned", color: "var(--ink)" },
    { num: summary.vulnerable_packages, label: "vulnerable packages", color: summary.vulnerable_packages>0 ? "var(--crit)" : "var(--pass)" },
    { num: summary.total_vulnerabilities, label: "total vulnerabilities", color: summary.total_vulnerabilities>0 ? "var(--crit)" : "var(--pass)" },
    { num: breakdown.critical + breakdown.high, label: "critical + high", color: breakdown.critical > 0 || breakdown.high > 0 ? "var(--crit)" : "var(--pass)" },
  ];
  return (
    <div>
      <div style={{display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"1px", background:"var(--line)"}}>
        {stats.map((s) => (
          <div key={s.label} style={{background:"var(--bg2)", padding:"16px"}}>
            <div style={{fontFamily:"var(--font-mono)", fontSize:"28px", fontWeight:700, color:s.color}}>{s.num}</div>
            <div style={{fontFamily:"var(--font-sans)", fontSize:"12px", color:"var(--muted)", marginTop:"4px"}}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{borderTop:"1px solid var(--line)", marginTop:"1px", paddingTop:"12px", display:"flex", gap:"16px", fontFamily:"var(--font-mono)", fontSize:"11px", color:"var(--muted)"}}>
        <span><span style={{color:"var(--crit)"}}>●</span> Critical {breakdown.critical}</span>
        <span><span style={{color:"var(--high)"}}>●</span> High {breakdown.high}</span>
        <span><span style={{color:"var(--warn)"}}>●</span> Medium {breakdown.medium}</span>
        <span><span style={{color:"var(--pass)"}}>●</span> Low {breakdown.low}</span>
      </div>
    </div>
  );
}
