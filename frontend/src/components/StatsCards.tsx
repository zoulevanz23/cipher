import type { ScanResponse } from "../types";

interface StatsCardsProps {
  summary: ScanResponse["summary"];
}

const severityConfig = {
  critical: { label: "Critical", color: "text-critical", bg: "bg-critical/10", border: "border-critical/20", icon: "!" },
  high: { label: "High", color: "text-high", bg: "bg-high/10", border: "border-high/20", icon: "!" },
  medium: { label: "Medium", color: "text-medium", bg: "bg-medium/10", border: "border-medium/20", icon: "!" },
  low: { label: "Low", color: "text-low", bg: "bg-low/10", border: "border-low/20", icon: "!" },
} as const;

export function StatsCards({ summary }: StatsCardsProps) {
  const totalVulns = summary.total_vulnerabilities;
  const severityBreakdown = summary.severity_breakdown;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 animate-slide-up">
      <Card
        label="Packages Scanned"
        value={summary.total_packages}
        icon={
          <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        }
      />
      <Card
        label="Vulnerable Packages"
        value={summary.vulnerable_packages}
        accent={summary.vulnerable_packages > 0}
        icon={
          <svg className={`w-5 h-5 ${summary.vulnerable_packages > 0 ? "text-critical" : "text-low"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d={summary.vulnerable_packages > 0 ? "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" : "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"} />
          </svg>
        }
      />
      <Card
        label="Total Vulnerabilities"
        value={totalVulns}
        accent={totalVulns > 0}
        icon={
          <svg className={`w-5 h-5 ${totalVulns > 0 ? "text-critical" : "text-low"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
      />
      <div className="p-4 rounded-xl bg-surface-2 border border-border">
        <p className="text-xs text-gray-500 font-medium mb-2">Severity Breakdown</p>
        <div className="space-y-1.5">
          {(Object.entries(severityConfig) as [keyof typeof severityBreakdown, typeof severityConfig[keyof typeof severityConfig]][]).map(([key, cfg]) => (
            <div key={key} className="flex items-center justify-between text-xs">
              <span className={cfg.color}>{cfg.label}</span>
              <span className="text-gray-300 font-mono font-medium">{severityBreakdown[key]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Card({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div className={`p-4 rounded-xl ${accent ? "bg-critical/5 border border-critical/20" : "bg-surface-2 border border-border"}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-500 font-medium">{label}</span>
        {icon}
      </div>
      <p className={`text-2xl font-bold font-mono ${accent ? "text-critical" : "text-body-text"}`}>
        {value}
      </p>
    </div>
  );
}
