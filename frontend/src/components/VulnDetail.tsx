import type { ScanResult, Vulnerability } from "../types";

interface Props {
  result: ScanResult;
  onClose: () => void;
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

export function VulnDetail({ result, onClose }: Props) {
  const vulnerable = result.vulnerabilities;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 pb-8">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[80vh] overflow-y-auto glass rounded-2xl border border-border p-6 sm:p-8 animate-slide-up">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold">{result.package.name}</h3>
            <p className="text-sm text-gray-500 font-mono mt-0.5">
              {result.package.version} &middot; {result.package.type}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-gray-400 hover:text-white transition-colors flex-shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {vulnerable.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-lg font-medium text-emerald-400">No known vulnerabilities</p>
            <p className="text-sm text-gray-500 mt-1">This package version appears to be safe.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {vulnerable.map((vuln) => (
              <VulnCard key={vuln.id} vuln={vuln} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function VulnCard({ vuln }: { vuln: Vulnerability }) {
  const border = severityColors[vuln.severity] ?? severityColors.UNKNOWN;
  const badge = severityBadge[vuln.severity] ?? severityBadge.UNKNOWN;

  return (
    <div className={`rounded-xl border p-4 ${border}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="font-mono text-sm font-medium truncate">{vuln.id}</p>
          {vuln.aliases.length > 0 && (
            <p className="text-xs text-gray-500 mt-0.5">{vuln.aliases.join(", ")}</p>
          )}
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-md border font-medium flex-shrink-0 ${badge}`}>
          {vuln.severity}
        </span>
      </div>
      <p className="text-sm text-gray-300 leading-relaxed">{vuln.summary}</p>
      {vuln.published && (
        <p className="text-xs text-gray-500 mt-2">
          Published: {new Date(vuln.published).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </p>
      )}
      {vuln.references.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-xs text-gray-500 font-medium mb-1.5">References</p>
          <div className="space-y-1">
            {vuln.references.slice(0, 3).map((ref, i) => (
              <a
                key={i}
                href={ref.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-xs text-accent hover:text-accent/80 truncate transition-colors"
              >
                {ref.url}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
