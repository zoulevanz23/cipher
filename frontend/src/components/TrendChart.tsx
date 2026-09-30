import { useMemo } from "react";

interface HistoryEntry {
  id: number;
  timestamp: string;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

interface Props { history: HistoryEntry[]; }

const COLORS: Record<string, string> = { critical:"var(--crit)", high:"var(--high)", medium:"var(--warn)", low:"var(--pass)" };
const LABELS = ["critical", "high", "medium", "low"];

export function TrendChart({ history }: Props) {
  const sorted = useMemo(() => [...history].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()), [history]);

  if (sorted.length < 2) {
    return (
      <div style={{border:"1px solid var(--line)", borderRadius:"8px", padding:"16px", background:"var(--bg2)"}}>
        <h4 style={{fontFamily:"var(--font-mono)", fontSize:"12px", color:"var(--ink)", fontWeight:600, marginBottom:"8px"}}>Severity Trends</h4>
        <p style={{fontFamily:"var(--font-mono)", fontSize:"12px", color:"var(--muted)"}}>Need at least 2 scans to show trends.</p>
      </div>
    );
  }

  const maxVal = Math.max(...sorted.flatMap((h) => [h.critical, h.high, h.medium, h.low]), 1);
  const W = 800, H = 240;
  const PAD = { left:44, right:16, top:16, bottom:32 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;
  const xScale = (i: number) => PAD.left + (i / Math.max(sorted.length - 1, 1)) * chartW;
  const yScale = (v: number) => PAD.top + chartH - (v / maxVal) * chartH;

  return (
    <div style={{border:"1px solid var(--line)", borderRadius:"8px", padding:"16px", background:"var(--bg2)"}}>
      <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"12px", flexWrap:"wrap", gap:"8px"}}>
        <div>
          <h4 style={{fontFamily:"var(--font-mono)", fontSize:"12px", color:"var(--ink)", fontWeight:600}}>Severity Trends</h4>
          <p style={{fontFamily:"var(--font-mono)", fontSize:"10px", color:"var(--muted)", marginTop:"2px"}}>Vulnerability counts across {sorted.length} scans</p>
        </div>
        <div style={{display:"flex", alignItems:"center", gap:"12px"}}>
          {LABELS.map((sev) => (
            <div key={sev} style={{display:"flex", alignItems:"center", gap:"4px"}}>
              <div style={{width:"8px", height:"8px", borderRadius:"2px", background:COLORS[sev]}} />
              <span style={{fontFamily:"var(--font-mono)", fontSize:"10px", color:"var(--muted)", textTransform:"uppercase"}}>{sev}</span>
            </div>
          ))}
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%"}}>
        {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
          const y = yScale(frac * maxVal);
          return (
            <g key={frac}>
              <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="var(--line)" strokeWidth={0.5} />
              <text x={PAD.left - 6} y={y + 3} textAnchor="end" fill="var(--muted)" fontSize={8} fontFamily="monospace">{Math.round(frac * maxVal)}</text>
            </g>
          );
        })}
        {LABELS.map((sev) => {
          const pts = sorted.map((h, i) => `${xScale(i)},${yScale(h[sev as keyof typeof h] as number)}`);
          return (
            <g key={sev}>
              <polyline points={pts.join(" ")} fill="none" stroke={COLORS[sev]} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" opacity={0.85} />
              {pts.map((pt, i) => {
                const val = sorted[i][sev as keyof typeof sorted[0]] as number;
                if (val === 0) return null;
                const [cx, cy] = pt.split(",");
                return <circle key={i} cx={cx} cy={cy} r={3} fill={COLORS[sev]} />;
              })}
            </g>
          );
        })}
        {sorted.map((h, i) => {
          const skip = Math.max(1, Math.floor(sorted.length / 8));
          if (i % skip !== 0) return null;
          return <text key={h.id} x={xScale(i)} y={H - 6} textAnchor="middle" fill="var(--muted)" fontSize={7} fontFamily="monospace">{h.timestamp.slice(5, 10)}</text>;
        })}
      </svg>
    </div>
  );
}
