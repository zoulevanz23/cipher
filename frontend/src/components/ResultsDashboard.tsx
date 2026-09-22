import { useState } from "react";
import type { ScanResult, Severity } from "../types";
import { DependencyTree } from "./DependencyTree";

const order: Record<string, number> = { CRITICAL:4, HIGH:3, MEDIUM:2, LOW:1, NONE:0, UNKNOWN:-1 };
const swatch: Record<string,string> = { CRITICAL:"bg-[#C1273B]", HIGH:"bg-[#A85419]", MEDIUM:"bg-[#8A6A14]", LOW:"bg-[#2C6E52]" };

export function ResultsDashboard({ results, onSelectResult }: { results: ScanResult[]; onSelectResult?: (r: ScanResult|null)=>void }) {
  const [filter, setFilter] = useState<Severity|"ALL">("ALL");
  const [sortBy, setSortBy] = useState<"severity"|"name">("severity");
  const sorted=[...results].sort((a,b)=> sortBy==="severity"?(order[b.max_severity]??0)-(order[a.max_severity]??0):a.package.name.localeCompare(b.package.name));
  const filtered=filter==="ALL"?sorted:sorted.filter(r=>r.max_severity===filter);
  const vuln=results.filter(r=>r.vulnerable);
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3 border-t border-[#12181F] pt-6 mb-3">
        <h2 className="font-[Space_Grotesk] font-bold text-[18px]"><span className="font-mono text-xs text-[#8593A1] mr-2">SHEET —</span>{vuln.length?`${vuln.length} package${vuln.length>1?"s":""} with vulnerabilities`:"All packages safe — [OK]"}</h2>
        <div className="flex items-center gap-2">
          <select value={filter} onChange={e=>setFilter(e.target.value as any)} className="border border-[#12181F] bg-white px-2 py-1 text-xs font-mono">
            <option value="ALL">All severities</option><option value="CRITICAL">Critical</option><option value="HIGH">High</option><option value="MEDIUM">Medium</option><option value="LOW">Low</option>
          </select>
          <button onClick={()=>setSortBy(sortBy==="severity"?"name":"severity")} className="border border-[#12181F] px-3 py-1 text-xs font-mono bg-[#EDF1F4]">Sort by {sortBy==="severity"?"name":"severity"}</button>
        </div>
      </div>
      <div className="border border-[#12181F]">
        <div className="hidden sm:flex text-[10px] font-mono tracking-[0.04em] text-[#8593A1] bg-[#E3E9ED] border-b border-[#12181F] px-3 py-2">
          <span className="flex-1">PACKAGE</span><span className="w-20 text-center">SEVERITY</span><span className="w-24 text-right">VULNS</span>
        </div>
        {filtered.map((r,i)=>(
          <button key={`${r.package.name}-${i}`} onClick={()=>onSelectResult?.(r)} className="w-full flex items-center gap-3 px-3 py-3 border-b last:border-b-0 border-[#B7C3CB] hover:bg-[#E3E9ED] text-left">
            <span className={`w-2 h-2 shrink-0 ${swatch[r.max_severity]??"bg-[#B7C3CB]"}`}/>
            <span className="flex-1 min-w-0 font-mono text-xs font-semibold truncate">{r.package.name}<span className="text-[#8593A1] font-normal ml-2">{r.package.version}</span></span>
            <span className="hidden sm:inline-flex text-[10px] font-mono border border-[#B7C3CB] px-1.5 py-0.5">{r.package.ecosystem ?? ""}</span>
            <span className={`text-[10px] font-mono font-bold px-2 py-1 border ${r.max_severity==="CRITICAL"?"border-[#C1273B] text-[#C1273B]": r.max_severity==="HIGH"?"border-[#A85419] text-[#A85419]": r.max_severity==="MEDIUM"?"border-[#8A6A14] text-[#8A6A14]":"border-[#2C6E52] text-[#2C6E52]"}`}>{r.max_severity}</span>
            <span className="w-12 text-right text-xs font-mono">{r.vulnerabilities.length}</span>
          </button>
        ))}
        {filtered.length===0&&<div className="text-center py-10 text-xs font-mono text-[#8593A1]">No results match filter.</div>}
      </div>
      {filtered.length>0 && <div className="mt-4 space-y-0">{filtered.map(r=> <div key={r.package.name} className="hidden"><DependencyTree dependencies={r.package.dependencies} packageName={r.package.name} /></div>)}</div>}
    </div>
  );
}
