interface Props {
  breakdown: { critical: number; high: number; medium: number; low: number };
}

const COLORS = { critical: "#ff4757", high: "#ff6348", medium: "#ffa502", low: "#2ed573" };
const LABELS = { critical: "CRITICAL", high: "HIGH", medium: "MEDIUM", low: "LOW" };

export function SeverityChart({ breakdown }: Props) {
  const max = Math.max(breakdown.critical, breakdown.high, breakdown.medium, breakdown.low, 1);

  return (
    <div className="bg-surface-2/50 border border-border rounded-xl p-5">
      <h4 className="text-xs font-mono text-gray-500 uppercase tracking-wider mb-4">Severity Breakdown</h4>
      <div className="space-y-3">
        {(Object.keys(COLORS) as Array<keyof typeof COLORS>).map((key) => (
          <div key={key} className="flex items-center gap-3">
            <span className="w-16 text-xs font-mono text-gray-400 text-right">{LABELS[key]}</span>
            <div className="flex-1 h-5 bg-surface-2 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(breakdown[key] / max) * 100}%`,
                  backgroundColor: COLORS[key],
                }}
              />
            </div>
            <span className="w-6 text-xs font-mono font-bold text-right" style={{ color: COLORS[key] }}>
              {breakdown[key]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
