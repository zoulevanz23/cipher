import { useMemo } from "react";

interface HistoryEntry {
  id: number;
  timestamp: string;
  results_json?: string;
}

interface Props {
  history: HistoryEntry[];
}

interface VulnAge {
  id: string;
  severity: string;
  package_name: string;
  first_seen: number;
  last_seen: number;
  scan_count: number;
  active: boolean;
}

const SEV_ORDER: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
const SEV_COLORS: Record<string, string> = {
  CRITICAL: "#ff4757", HIGH: "#ff6348", MEDIUM: "#ffa502", LOW: "#2ed573",
};

export function VulnAging({ history }: Props) {
  const vulnAges = useMemo(() => {
    const sorted = [...history].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
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
              vulnMap.set(key, {
                id: vuln.id,
                severity: vuln.severity || "UNKNOWN",
                package_name: pkgName,
                first_seen: scanIdx,
                last_seen: scanIdx,
                scan_count: 1,
                active: true,
              });
            }
          }
        }
      } catch {}
    });

    const latestIdx = sorted.length - 1;
    for (const v of vulnMap.values()) {
      v.active = v.last_seen === latestIdx;
    }

    return Array.from(vulnMap.values()).sort(
      (a, b) => SEV_ORDER[b.severity] - SEV_ORDER[a.severity] || a.first_seen - b.first_seen
    );
  }, [history]);

  if (vulnAges.length === 0) {
    return (
      <div className="bg-surface-2/50 border border-border rounded-xl p-5">
        <h4 className="text-xs font-mono text-gray-500 uppercase tracking-wider mb-4">Vulnerability Aging</h4>
        <p className="text-xs text-gray-500 font-mono">No vulnerability data in history.</p>
      </div>
    );
  }

  const active = vulnAges.filter((v) => v.active);
  const fixed = vulnAges.filter((v) => !v.active);
  const scanCount = history.length;

  return (
    <div className="bg-surface-2/50 border border-border rounded-xl p-5 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="text-xs font-mono text-gray-500 uppercase tracking-wider">Vulnerability Aging</h4>
          <p className="text-[10px] text-gray-600 font-mono mt-0.5">Persistence across {scanCount} scan{scanCount !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-mono">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-critical" />
            <span className="text-critical">{active.length} active</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-low" />
            <span className="text-low">{fixed.length} fixed</span>
          </span>
        </div>
      </div>

      <div className="flex-1 space-y-1.5 max-h-64 overflow-y-auto">
        {vulnAges.slice(0, 25).map((v) => {
          const pct = Math.round((v.scan_count / Math.max(scanCount, 1)) * 100);
          const color = SEV_COLORS[v.severity] || "#9ca3af";
          return (
            <div key={`${v.id}::${v.package_name}`} className="flex items-center gap-2 text-[10px] font-mono py-0.5">
              <span className={`w-2 h-2 rounded-full shrink-0 ${v.active ? "bg-critical" : "bg-low"}`} />
              <span className="w-1.5 h-1.5 rounded-sm shrink-0" style={{ backgroundColor: color }} title={v.severity} />
              <span className="text-gray-400 truncate min-w-0 flex-1">{v.package_name}</span>
              <span className="text-gray-500 shrink-0">{v.id}</span>
              <div className="w-12 bg-surface-2 rounded-full h-1.5 overflow-hidden shrink-0">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${pct}%`, backgroundColor: v.active ? "var(--color-critical)" : "var(--color-low)" }}
                />
              </div>
              <span className="text-gray-500 w-6 text-right shrink-0">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
