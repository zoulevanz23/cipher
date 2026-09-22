const COLORS: Record<string,string> = { critical: "#C1273B", high: "#A85419", medium: "#8A6A14", low: "#2C6E52" };
const LABELS: Record<string,string> = { critical: "CRITICAL", high: "HIGH", medium: "MEDIUM", low: "LOW" };

export function SeverityChart({ breakdown }: { breakdown: { critical:number; high:number; medium:number; low:number } }) {
  const max = Math.max(breakdown.critical, breakdown.high, breakdown.medium, breakdown.low, 1);
  return (
    <div className="border border-[#12181F] p-4 bg-[#E3E9ED]">
      <h4 className="text-[10px] font-mono tracking-[0.04em] text-[#8593A1] font-semibold mb-3">SEVERITY BREAKDOWN</h4>
      <div className="space-y-2.5">
        {(Object.keys(COLORS) as Array<keyof typeof COLORS>).map((key) => (
          <div key={key} className="flex items-center gap-3">
            <span className="w-16 text-[11px] font-mono text-[#4C5A67] text-right">{LABELS[key]}</span>
            <div className="flex-1 h-3 bg-white border border-[#B7C3CB] overflow-hidden">
              <div className="h-full transition-all" style={{ width: `${(breakdown[key as keyof typeof breakdown]/max)*100}%`, backgroundColor: COLORS[key] }} />
            </div>
            <span className="w-5 text-xs font-mono font-bold text-right" style={{ color: COLORS[key] }}>{breakdown[key as keyof typeof breakdown]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
