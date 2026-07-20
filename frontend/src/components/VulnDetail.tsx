import { useState } from "react";
import type { ScanResult, Vulnerability, FixSuggestion } from "../types";

interface Props {
  result: ScanResult;
  onClose: () => void;
  fix?: FixSuggestion;
}

const severityColors: Record<string, string> = {
  CRITICAL:
    "border-critical/30 bg-critical/5",
  HIGH: "border-high/30 bg-high/5",
  MEDIUM: "border-medium/30 bg-medium/5",
  LOW: "border-low/30 bg-low/5",
  UNKNOWN: "border-gray-500/30 bg-gray-500/5",
};

const severityBadge: Record<string, string> = {
  CRITICAL: "bg-critical/15 text-critical border-critical/25",
  HIGH: "bg-high/15 text-high border-high/25",
  MEDIUM: "bg-medium/15 text-medium border-medium/25",
  LOW: "bg-low/15 text-low border-low/25",
  UNKNOWN: "bg-gray-500/10 text-gray-400 border-gray-500/20",
};

export function VulnDetail({ result, onClose, fix }: Props) {
  const vulnerable = result.vulnerabilities;

  return (
    <div className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl max-h-[85vh] overflow-y-auto glass rounded-2xl border border-border shadow-2xl shadow-black/50 animate-slide-up">
        <div className="sticky top-0 z-10 bg-surface/90 backdrop-blur-md border-b border-border flex items-start justify-between p-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-bold">{result.package.name}</h3>
              {result.package.ecosystem && (
                <span className="text-[10px] px-1.5 py-0.5 rounded border bg-gray-500/10 text-gray-400 border-gray-500/20 font-mono">
                  {result.package.ecosystem}
                </span>
              )}
              {result.package.license && result.package.license !== "Unknown" && (
                <span className="text-[10px] px-1.5 py-0.5 rounded border border-purple-500/20 bg-purple-500/10 text-purple-400 font-mono">
                  {result.package.license}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 font-mono mt-1">
              {result.package.version}
              {result.health_score !== undefined && (
                <span className="ml-3 text-gray-600">
                  health: <span className={result.health_score >= 80 ? "text-emerald-400" : result.health_score >= 50 ? "text-amber-400" : "text-red-400"}>{result.health_score}/100</span>
                </span>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-gray-400 hover:text-body-text hover:bg-red-500/20 hover:border-red-500/30 transition-all shrink-0 ml-4"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {fix && (
            <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-emerald-400 font-mono flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Recommended Fix
                </p>
                {fix.risk && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono border ${
                    fix.risk === "safe" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                    fix.risk === "minor" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                    fix.risk === "major" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                    "bg-gray-500/10 text-gray-400 border-gray-500/20"
                  }`}>
                    {fix.risk_label || fix.risk}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm text-gray-400">Upgrade</span>
                <span className="text-sm text-red-400 font-mono line-through">{fix.current_version}</span>
                <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                <span className="text-sm text-emerald-400 font-mono font-semibold">{fix.recommended_version}</span>
              </div>
              {fix.latest_version !== "unknown" && fix.latest_version !== fix.recommended_version && (
                <p className="text-xs text-gray-500 mt-1.5 font-mono">
                  Latest available: {fix.latest_version}
                </p>
              )}
              <div className="mt-3 pt-3 border-t border-emerald-500/10 text-xs font-mono text-gray-500 flex items-center gap-2">
                <span className="text-gray-600">$</span>
                <code className="bg-surface-2 px-2 py-0.5 rounded text-gray-300">npm install {result.package.name}@{fix.recommended_version}</code>
              </div>
            </div>
          )}

          {vulnerable.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-lg font-medium text-emerald-400">No known vulnerabilities</p>
              <p className="text-sm text-gray-500 mt-1">This package version appears to be safe.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {vulnerable.map((vuln) => (
                <VulnCard key={vuln.id} vuln={vuln} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const sourceStyles: Record<string, string> = {
  osv: "bg-accent/10 text-accent border-accent/20",
  nvd: "bg-info/10 text-info border-info/20",
};

function VulnCard({ vuln }: { vuln: Vulnerability }) {
  const [expanded, setExpanded] = useState(false);
  const border = severityColors[vuln.severity] ?? severityColors.UNKNOWN;
  const badge = severityBadge[vuln.severity] ?? severityBadge.UNKNOWN;
  const src = vuln.source || "osv";
  const srcStyle = sourceStyles[src] || "bg-gray-500/10 text-gray-400 border-gray-500/20";

  return (
    <div className={`rounded-xl border ${border} overflow-hidden`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start justify-between gap-3 p-4 hover:bg-white/2 transition-colors text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-md border font-medium shrink-0 ${badge}`}>
              {vuln.severity}
            </span>
            <span className={`text-[9px] px-1.5 py-0.5 rounded border font-mono ${srcStyle}`}>
              {src.toUpperCase()}
            </span>
            <p className="font-mono text-sm font-medium">{vuln.id}</p>
            {vuln.cvss_score != null && (
              <span className="text-[10px] font-mono text-gray-500 bg-surface-2 px-1.5 py-0.5 rounded">
                CVSS {vuln.cvss_score.toFixed(1)}
              </span>
            )}
            {vuln.cwe_id && (
              <span className="text-[9px] font-mono text-gray-600 bg-surface-2 px-1.5 py-0.5 rounded">
                {vuln.cwe_id}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-300 mt-2 leading-relaxed line-clamp-2">{vuln.summary}</p>
        </div>
        <svg
          className={`w-4 h-4 text-gray-600 mt-1 shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="border-t border-border/50 px-4 pb-4 pt-3 space-y-3 animate-slide-up">
          {vuln.aliases.length > 0 && (
            <div>
              <p className="text-[10px] text-gray-600 font-mono uppercase tracking-wider mb-1">Aliases</p>
              <div className="flex flex-wrap gap-1.5">
                {vuln.aliases.map((a) => (
                  <span key={a} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-gray-500/10 text-gray-400 border border-gray-500/20">
                    {a}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 text-[10px] font-mono text-gray-500">
            {vuln.cvss_score != null && (
              <span>CVSS {vuln.cvss_score.toFixed(1)}</span>
            )}
            {vuln.cvss_vector && (
              <span className="text-gray-600 truncate max-w-[200px]" title={vuln.cvss_vector}>
                {vuln.cvss_vector}
              </span>
            )}
            {vuln.cwe_id && (
              <span>{vuln.cwe_id}</span>
            )}
          </div>

          <p className="text-sm text-gray-300 leading-relaxed">{vuln.summary}</p>

          {vuln.published && (
            <p className="text-xs text-gray-500">
              Published: {new Date(vuln.published).toLocaleDateString("en-US", {
                year: "numeric", month: "short", day: "numeric",
              })}
            </p>
          )}

          {vuln.references.length > 0 && (
            <div className="pt-2 border-t border-border/50">
              <p className="text-[10px] text-gray-600 font-mono uppercase tracking-wider mb-1.5">References</p>
              <div className="space-y-1">
                {vuln.references.slice(0, 3).map((ref, i) => (
                  <a
                    key={i}
                    href={ref.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-xs text-accent hover:text-accent/80 truncate transition-colors font-mono"
                  >
                    {ref.url}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
