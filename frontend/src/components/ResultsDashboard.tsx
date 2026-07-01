import { useState } from "react";
import type { ScanResult, Severity } from "../types";
import { VulnDetail } from "./VulnDetail";

interface Props {
  results: ScanResult[];
}

const severityOrder: Record<string, number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
  NONE: 0,
  UNKNOWN: -1,
};

const severityBadge: Record<string, { label: string; classes: string }> = {
  CRITICAL: {
    label: "CRITICAL",
    classes: "bg-critical/15 text-critical border-critical/25",
  },
  HIGH: {
    label: "HIGH",
    classes: "bg-high/15 text-high border-high/25",
  },
  MEDIUM: {
    label: "MEDIUM",
    classes: "bg-medium/15 text-medium border-medium/25",
  },
  LOW: {
    label: "LOW",
    classes: "bg-low/15 text-low border-low/25",
  },
  NONE: {
    label: "SAFE",
    classes: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  },
  UNKNOWN: {
    label: "UNKNOWN",
    classes: "bg-gray-500/10 text-gray-400 border-gray-500/20",
  },
};

export function ResultsDashboard({ results }: Props) {
  const [selectedResult, setSelectedResult] = useState<ScanResult | null>(null);
  const [severityFilter, setSeverityFilter] = useState<Severity | "ALL">("ALL");
  const [sortBy, setSortBy] = useState<"severity" | "name">("severity");

  const sorted = [...results].sort((a, b) => {
    if (sortBy === "severity") {
      return (severityOrder[b.max_severity] ?? 0) - (severityOrder[a.max_severity] ?? 0);
    }
    return a.package.name.localeCompare(b.package.name);
  });

  const filtered =
    severityFilter === "ALL"
      ? sorted
      : sorted.filter((r) => r.max_severity === severityFilter);

  const vulnerableResults = results.filter((r) => r.vulnerable);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-bold">
          <span className="text-gray-400 font-mono text-sm mr-1">$</span>
          {vulnerableResults.length > 0
            ? `${vulnerableResults.length} package${vulnerableResults.length > 1 ? "s" : ""} with vulnerabilities`
            : "All packages are safe — [OK]"}
        </h2>
        <div className="flex items-center gap-3 text-sm">
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as Severity | "ALL")}
            className="bg-surface-2 border border-border rounded-lg px-3 py-1.5 text-gray-300 focus:outline-none focus:ring-1 focus:ring-accent/50"
          >
            <option value="ALL">All severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
          <button
            onClick={() => setSortBy(sortBy === "severity" ? "name" : "severity")}
            className="bg-surface-2 border border-border rounded-lg px-3 py-1.5 text-gray-300 hover:text-white transition-colors"
          >
            Sort by {sortBy === "severity" ? "name" : "severity"}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {filtered.map((result, i) => (
          <div
            key={`${result.package.name}-${i}`}
            className="animate-slide-up"
            style={{ animationDelay: `${i * 0.03}s` }}
          >
            <PackageRow
              result={result}
              onClick={() => setSelectedResult(result)}
            />
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No results match the current filter.
          </div>
        )}
      </div>

      {selectedResult && (
        <VulnDetail
          result={selectedResult}
          onClose={() => setSelectedResult(null)}
        />
      )}
    </div>
  );
}

function PackageRow({
  result,
  onClick,
}: {
  result: ScanResult;
  onClick: () => void;
}) {
  const badge = severityBadge[result.max_severity] ?? severityBadge.UNKNOWN;
  const count = result.vulnerabilities.length;

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between p-4 rounded-xl bg-surface-2 border border-border hover:border-accent/30 hover:bg-accent/[0.02] transition-all group text-left tech-border"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-mono font-bold text-gray-500">
            {result.package.name[0].toUpperCase()}
          </span>
        </div>
        <div className="min-w-0">
          <p className="font-medium text-sm truncate">{result.package.name}</p>
          <p className="text-xs text-gray-500 font-mono">{result.package.version}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <span className={`text-xs px-2 py-0.5 rounded-md border font-medium ${badge.classes}`}>
          {badge.label}
        </span>
        {count > 0 && (
          <span className="text-xs text-gray-400 font-mono">
            {count} vuln{count > 1 ? "s" : ""}
          </span>
        )}
        <svg className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  );
}
