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
  results_json?: string;
  fixes_json?: string;
}

const BASE = "/api";

export function HistoryDashboard({ onLoad }: { onLoad?: (id: number) => void }) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const PER_PAGE = 10;

  useEffect(() => {
    fetch(`${BASE}/scan/history?limit=20`)
      .then((r) => r.json())
      .then((data) => { setHistory(data); setPage(0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-xs text-gray-500 font-mono">Loading history...</div>;
  if (history.length === 0) return <div className="text-xs text-gray-600 font-mono">No scan history yet.</div>;

  const totalPages = Math.ceil(history.length / PER_PAGE);
  const pageData = history.slice(page * PER_PAGE, (page + 1) * PER_PAGE);

  const Pagination = () => (
    <div className="flex items-center justify-center gap-4 pt-2">
      <button
        onClick={() => setPage((p) => Math.max(0, p - 1))}
        disabled={page === 0}
        className="text-xs font-mono px-3 py-1.5 rounded-lg border border-border text-gray-400 hover:text-accent hover:border-accent/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-1"
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        prev
      </button>
      <span className="text-[10px] font-mono text-gray-600">
        {page * PER_PAGE + 1}–{Math.min((page + 1) * PER_PAGE, history.length)} / {history.length}
      </span>
      <button
        onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
        disabled={page >= totalPages - 1}
        className="text-xs font-mono px-3 py-1.5 rounded-lg border border-border text-gray-400 hover:text-accent hover:border-accent/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-1"
      >
        next
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      <TrendChart history={pageData} />
      <Pagination />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <VulnAging history={pageData} />
        <FixVelocity history={pageData} />
      </div>
      <Pagination />

      <div className="bg-surface-2/50 border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <h4 className="text-xs font-mono text-gray-500 uppercase tracking-wider">Scan History</h4>
          <span className="text-[10px] font-mono text-gray-600">{history.length} scans</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="text-gray-600 border-b border-border">
                <th className="text-left px-4 py-2">Date</th>
                <th className="text-left px-4 py-2">Project</th>
                <th className="text-center px-4 py-2">Packages</th>
                <th className="text-center px-4 py-2">Vuln</th>
                <th className="text-center px-4 py-2 text-critical">C</th>
                <th className="text-center px-4 py-2 text-high">H</th>
                <th className="text-center px-4 py-2 text-medium">M</th>
                <th className="text-center px-4 py-2 text-low">L</th>
              </tr>
            </thead>
            <tbody>
              {pageData.map((h) => (
                <tr
                  key={h.id}
                  onClick={() => onLoad?.(h.id)}
                  className="border-b border-border/50 hover:bg-surface-2 transition-colors cursor-pointer"
                >
                  <td className="px-4 py-2 text-gray-400">{h.timestamp.slice(0, 10)}</td>
                  <td className="px-4 py-2 text-gray-300">{h.project_name || "-"}</td>
                  <td className="px-4 py-2 text-center text-gray-400">{h.total_packages}</td>
                  <td className="px-4 py-2 text-center" style={{ color: h.vulnerable_packages > 0 ? "#ff4757" : "#2ed573" }}>
                    {h.vulnerable_packages}
                  </td>
                  <td className="px-4 py-2 text-center text-critical">{h.critical}</td>
                  <td className="px-4 py-2 text-center text-high">{h.high}</td>
                  <td className="px-4 py-2 text-center text-medium">{h.medium}</td>
                  <td className="px-4 py-2 text-center text-low">{h.low}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-border/50 px-4 py-3">
          <Pagination />
        </div>
      </div>
    </div>
  );
}
