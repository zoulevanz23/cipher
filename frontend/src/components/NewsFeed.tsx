import { useState, useEffect, useMemo } from "react";

interface NewsItem {
  id: string;
  summary: string;
  severity: string;
  published: string;
  url: string;
}

const BASE = "/api";
const SEVERITIES = ["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"];

const severityBadge: Record<string, string> = {
  CRITICAL: "bg-critical/15 text-critical border-critical/25",
  HIGH: "bg-high/15 text-high border-high/25",
  MEDIUM: "bg-medium/15 text-medium border-medium/25",
  LOW: "bg-low/15 text-low border-low/25",
};

export function NewsFeed() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("ALL");

  useEffect(() => {
    fetch(`${BASE}/news?limit=20`)
      .then((r) => r.json())
      .then(setNews)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return news.filter((item) => {
      const q = search.toLowerCase();
      if (q && !item.summary.toLowerCase().includes(q) && !item.id.toLowerCase().includes(q) && !item.severity.toLowerCase().includes(q)) {
        return false;
      }
      if (severityFilter !== "ALL" && item.severity !== severityFilter) {
        return false;
      }
      return true;
    });
  }, [news, search, severityFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search advisories by keyword, package, or CVE... (react, npm, git, ...)"
            className="w-full pl-10 pr-4 py-2.5 bg-surface-2/50 border border-border rounded-xl text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all font-mono"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <div className="flex gap-1.5">
          {SEVERITIES.map((s) => (
            <button
              key={s}
              onClick={() => setSeverityFilter(s)}
              className={`text-xs font-mono px-3 py-2 rounded-lg border transition-all ${
                severityFilter === s
                  ? "bg-accent/20 border-accent/40 text-accent"
                  : "border-border text-gray-500 hover:text-gray-300 hover:border-gray-500"
              }`}
            >
              {s === "ALL" ? "All" : s}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-surface-2/50 border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <h4 className="text-xs font-mono text-gray-500 uppercase tracking-wider flex items-center gap-2">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Security News
            <span className="text-gray-600 font-normal normal-case ml-1">({filtered.length} advisory{filtered.length !== 1 ? "ies" : "y"})</span>
          </h4>
          <span className="text-[10px] text-gray-600 font-mono">GitHub Advisory</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 rounded-full border-4 border-surface-2" />
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-accent animate-spin" />
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <svg className="w-10 h-10 mx-auto mb-3 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <p className="text-sm text-gray-500 font-mono">No advisories match your filter.</p>
            <button
              onClick={() => { setSearch(""); setSeverityFilter("ALL"); }}
              className="text-xs text-accent hover:text-accent/80 font-mono mt-2 transition-colors"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {filtered.map((item) => (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block px-5 py-4 hover:bg-surface-2/80 transition-colors group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-medium border shrink-0 ${
                        severityBadge[item.severity] || "bg-gray-500/10 text-gray-400 border-gray-500/20"
                      }`}>
                        {item.severity}
                      </span>
                      <span className="text-[10px] font-mono text-gray-600 truncate">{item.id}</span>
                      <span className="text-[10px] font-mono text-gray-600">·</span>
                      <span className="text-[10px] font-mono text-gray-600 shrink-0">{item.published}</span>
                    </div>
                    <p className="text-sm text-gray-300 leading-relaxed group-hover:text-body-text transition-colors">{item.summary}</p>
                  </div>
                  <svg className="w-4 h-4 text-gray-600 mt-1 shrink-0 group-hover:text-gray-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}