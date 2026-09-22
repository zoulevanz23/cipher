import type { ScanResponse } from "../types";

export function StatsCards({ summary }: StatsCardsProps) {
  const breakdown = summary.severity_breakdown;
  return (
    <div className="border border-[#12181F]">
      <div className="grid grid-cols-2 sm:grid-cols-4">
        <div className="px-4 py-4 border-r border-[#B7C3CB] border-b sm:border-b-0"><div className="font-[Space_Grotesk] font-bold text-[26px] leading-none">{summary.total_packages}</div><div className="text-[10.5px] font-mono text-[#8593A1] mt-1">packages scanned</div></div>
        <div className="px-4 py-4 border-r-0 sm:border-r border-[#B7C3CB] border-b sm:border-b-0"><div className={`font-[Space_Grotesk] font-bold text-[26px] leading-none ${summary.vulnerable_packages>0?"text-[#C1273B]":""}`}>{summary.vulnerable_packages}</div><div className="text-[10.5px] font-mono text-[#8593A1] mt-1">vulnerable packages</div></div>
        <div className="px-4 py-4 border-r border-[#B7C3CB]"><div className={`font-[Space_Grotesk] font-bold text-[26px] leading-none ${summary.total_vulnerabilities>0?"text-[#C1273B]":""}`}>{summary.total_vulnerabilities}</div><div className="text-[10.5px] font-mono text-[#8593A1] mt-1">total vulnerabilities</div></div>
        <div className="px-4 py-4 bg-[#E3E9ED]">
          <div className="text-[10px] font-mono tracking-[0.04em] text-[#8593A1] font-semibold mb-2">SEVERITY BREAKDOWN</div>
          <div className="space-y-1 text-xs font-mono">
            <div className="flex justify-between"><span><span className="inline-block w-2 h-2 bg-[#C1273B] mr-2"/>Critical</span><span className="font-bold">{breakdown.critical}</span></div>
            <div className="flex justify-between"><span><span className="inline-block w-2 h-2 bg-[#A85419] mr-2"/>High</span><span className="font-bold">{breakdown.high}</span></div>
            <div className="flex justify-between"><span><span className="inline-block w-2 h-2 bg-[#8A6A14] mr-2"/>Medium</span><span className="font-bold">{breakdown.medium}</span></div>
            <div className="flex justify-between"><span><span className="inline-block w-2 h-2 bg-[#2C6E52] mr-2"/>Low</span><span className="font-bold">{breakdown.low}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
interface StatsCardsProps { summary: ScanResponse["summary"]; }
