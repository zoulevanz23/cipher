import { useMemo } from "react";

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

interface Props {
  history: HistoryEntry[];
}

const COLORS: Record<string, string> = {
  critical: "#ff4757",
  high: "#ff6348",
  medium: "#ffa502",
  low: "#2ed573",
};

const LABELS = ["critical", "high", "medium", "low"];

export function TrendChart({ history }: Props) {
  const sorted = useMemo(
    () => [...history].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
    [history]
  );

  if (sorted.length < 2) {
    return (
      <div className="bg-surface-2/50 border border-border rounded-xl p-5">
        <h4 className="text-xs font-mono text-gray-500 uppercase tracking-wider mb-4">Severity Trends</h4>
        <p className="text-xs text-gray-500 font-mono">Need at least 2 scans to show trends.</p>
      </div>
    );
  }

  const maxVal = Math.max(
    ...sorted.flatMap((h) => [h.critical, h.high, h.medium, h.low]),
    1
  );

  const W = 800;
  const H = 240;
  const PAD = { left: 44, right: 16, top: 16, bottom: 32 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const xScale = (i: number) => PAD.left + (i / Math.max(sorted.length - 1, 1)) * chartW;
  const yScale = (v: number) => PAD.top + chartH - (v / maxVal) * chartH;

  return (
    <div className="bg-surface-2/50 border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="text-xs font-mono text-gray-500 uppercase tracking-wider">Severity Trends</h4>
          <p className="text-[10px] text-gray-600 font-mono mt-0.5">Vulnerability counts across {sorted.length} scans</p>
        </div>
        {/* Legend */}
        <div className="flex items-center gap-3">
          {LABELS.map((sev) => (
            <div key={sev} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: COLORS[sev] }} />
              <span className="text-[10px] font-mono text-gray-500 uppercase">{sev}</span>
            </div>
          ))}
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
          const y = yScale(frac * maxVal);
          return (
            <g key={frac}>
              <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="var(--color-border)" strokeWidth={0.5} />
              <text x={PAD.left - 6} y={y + 3} textAnchor="end" fill="var(--color-gray-400)" fontSize="8" fontFamily="monospace">
                {Math.round(frac * maxVal)}
              </text>
            </g>
          );
        })}

        {/* Lines + dots for each severity */}
        {LABELS.map((sev) => {
          const pts = sorted.map((h, i) => `${xScale(i)},${yScale(h[sev as keyof typeof h] as number)}`);
          const points = pts.join(" ");
          return (
            <g key={sev}>
              <polyline points={points} fill="none" stroke={COLORS[sev]} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" opacity={0.85} />
              {pts.map((pt, i) => {
                const [cx, cy] = pt.split(",");
                const val = sorted[i][sev as keyof typeof sorted[0]] as number;
                if (val === 0) return null;
                return (
                  <g key={i}>
                    <circle cx={cx} cy={cy} r={3} fill={COLORS[sev]} stroke="var(--color-surface)" strokeWidth={1.5} />
                    <title>{sev}: {val} on {sorted[i].timestamp.slice(0, 10)}</title>
                  </g>
                );
              })}
            </g>
          );
        })}

        {/* X-axis labels */}
        {sorted.map((h, i) => {
          const skip = Math.max(1, Math.floor(sorted.length / 8));
          if (i % skip !== 0) return null;
          return (
            <text key={h.id} x={xScale(i)} y={H - 6} textAnchor="middle" fill="var(--color-gray-500)" fontSize="7" fontFamily="monospace">
              {h.timestamp.slice(5, 10)}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
