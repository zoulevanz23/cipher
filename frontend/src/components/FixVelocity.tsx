import { useMemo } from "react";

interface HistoryEntry {
  id: number;
  timestamp: string;
  fixes_json?: string;
  total_vulnerabilities: number;
}

interface Props {
  history: HistoryEntry[];
}

const RISK_COLORS: Record<string, string> = {
  safe: "#2ed573",
  minor: "#ffa502",
  major: "#ff4757",
};

export function FixVelocity({ history }: Props) {
  const scans = useMemo(() => {
    const sorted = [...history].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    return sorted.map((entry) => {
      let fixes: Array<{ risk?: string }> = [];
      if (entry.fixes_json) {
        try { fixes = JSON.parse(entry.fixes_json); } catch {}
      }
      const safe = fixes.filter((f) => f.risk === "safe").length;
      const minor = fixes.filter((f) => f.risk === "minor").length;
      const major = fixes.filter((f) => f.risk === "major").length;
      return { id: entry.id, date: entry.timestamp.slice(0, 10), total: fixes.length, safe, minor, major, vulns: entry.total_vulnerabilities };
    });
  }, [history]);

  if (scans.length === 0) {
    return (
      <div className="bg-surface-2/50 border border-border rounded-xl p-5">
        <h4 className="text-xs font-mono text-gray-500 uppercase tracking-wider mb-4">Fix Velocity</h4>
        <p className="text-xs text-gray-500 font-mono">No fix data available.</p>
      </div>
    );
  }

  const maxTotal = Math.max(...scans.map((s) => s.total), 1);

  const totalSafe = scans.reduce((s, c) => s + c.safe, 0);
  const totalMinor = scans.reduce((s, c) => s + c.minor, 0);
  const totalMajor = scans.reduce((s, c) => s + c.major, 0);

  return (
    <div className="bg-surface-2/50 border border-border rounded-xl p-5 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="text-xs font-mono text-gray-500 uppercase tracking-wider">Fix Velocity</h4>
          <p className="text-[10px] text-gray-600 font-mono mt-0.5">Fixes suggested per scan</p>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono">
          {(["safe", "minor", "major"] as const).map((risk) => {
            const count = risk === "safe" ? totalSafe : risk === "minor" ? totalMinor : totalMajor;
            if (count === 0) return null;
            return (
              <span key={risk} style={{ color: RISK_COLORS[risk] }} className="capitalize">
                {risk} {count}
              </span>
            );
          })}
        </div>
      </div>

      <div className="flex-1 space-y-1.5 overflow-y-auto">
        {scans.map((scan) => {
          const barPct = (scan.total / maxTotal) * 100;
          return (
            <div key={scan.id} className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-gray-500 w-14 shrink-0">{scan.date}</span>
              <div className="flex-1 h-5 bg-surface-2 rounded-full overflow-hidden flex" style={{ maxWidth: `${Math.max(barPct, 8)}%` }}>
                {(["safe", "minor", "major"] as const).map((risk) => {
                  const count = scan[risk];
                  if (count === 0) return null;
                  return (
                    <div
                      key={risk}
                      style={{ width: `${(count / scan.total) * 100}%`, backgroundColor: RISK_COLORS[risk] }}
                      className="h-full first:rounded-l-full last:rounded-r-full"
                      title={`${risk}: ${count}`}
                    />
                  );
                })}
              </div>
              <span className="text-[10px] font-mono text-gray-500 w-16 shrink-0">
                {scan.total > 0 ? `${scan.total} fixes` : "—"}
                {scan.vulns > 0 && <span className="text-gray-600"> · {scan.vulns}v</span>}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
