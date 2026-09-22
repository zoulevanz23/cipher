import { useState } from "react";
import type { ScanResult, Vulnerability, FixSuggestion } from "../types";

const col: Record<string,string> = { CRITICAL:"#C1273B", HIGH:"#A85419", MEDIUM:"#8A6A14", LOW:"#2C6E52" };

export function VulnDetail({ result, onClose, fix }: { result: ScanResult; onClose:()=>void; fix?:FixSuggestion }) {
  return (
    <div className="fixed inset-0 z-[70]">
      <div className="fixed inset-0 bg-[#12181F]/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl max-h-[85vh] overflow-y-auto bg-[#EDF1F4] border border-[#12181F] animate-slide-up">
        <div className="sticky top-0 bg-[#E3E9ED] border-b border-[#12181F] flex items-start justify-between p-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-[Space_Grotesk] font-bold text-[16px]">{result.package.name}</h3>
              {result.package.ecosystem && <span className="text-[10px] font-mono border border-[#B7C3CB] px-1.5 py-0.5 bg-white">{result.package.ecosystem}</span>}
              {result.package.license && result.package.license!=="Unknown" && <span className="text-[10px] font-mono border border-[#B7C3CB] px-1.5 py-0.5 bg-white">{result.package.license}</span>}
            </div>
            <p className="text-xs font-mono text-[#4C5A67] mt-1">{result.package.version}{result.health_score!==undefined && <span className="ml-3">health: <span style={{color: result.health_score>=80?"#2C6E52":result.health_score>=50?"#A85419":"#C1273B"}}>{result.health_score}/100</span></span>}</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 border border-[#12181F] flex items-center justify-center hover:bg-[#12181F] hover:text-[#EDF1F4]">✕</button>
        </div>
        <div className="p-4 space-y-4">
          {fix && (
            <div className="border border-[#2C6E52] bg-[#2C6E52]/5 p-3">
              <p className="text-[11px] font-mono font-bold text-[#2C6E52] flex items-center gap-1.5">Recommended Fix {fix.risk && <span className="ml-auto text-[10px] border border-[#B7C3CB] px-1.5 py-0.5 bg-white">{fix.risk_label||fix.risk}</span>}</p>
              <div className="flex items-center gap-2 mt-2 font-mono text-xs">
                <span className="line-through text-[#C1273B]">{fix.current_version}</span> → <span className="font-bold text-[#2C6E52]">{fix.recommended_version}</span>
              </div>
              <code className="block mt-2 bg-white border border-[#B7C3CB] px-2 py-1 text-xs font-mono">npm install {result.package.name}@{fix.recommended_version}</code>
            </div>
          )}
          {result.vulnerabilities.length===0 ? (
            <div className="py-10 text-center border border-[#2C6E52] bg-[#2C6E52]/5"><p className="font-bold text-[#2C6E52]">No known vulnerabilities</p><p className="text-xs font-mono text-[#4C5A67] mt-1">This package version appears safe.</p></div>
          ) : result.vulnerabilities.map(v=><VulnCard key={v.id} vuln={v} />)}
        </div>
      </div>
    </div>
  );
}

function VulnCard({ vuln }: { vuln: Vulnerability }) {
  const [open,setOpen]=useState(false);
  return (
    <div className="border border-[#12181F] bg-white">
      <button onClick={()=>setOpen(!open)} className="w-full flex items-start justify-between gap-3 p-3 text-left">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 border text-white" style={{background: col[vuln.severity]??"#8593A1", borderColor: col[vuln.severity]??"#8593A1"}}>{vuln.severity}</span>
            <span className="text-[10px] font-mono border border-[#B7C3CB] px-1 py-0.5 bg-[#E3E9ED]">{(vuln.source||"osv").toUpperCase()}</span>
            <span className="font-mono text-xs font-semibold">{vuln.id}</span>
            {vuln.cvss_score!=null && <span className="text-[10px] font-mono border border-[#B7C3CB] px-1 py-0.5 bg-white">CVSS {vuln.cvss_score.toFixed(1)}</span>}
          </div>
          <p className="text-xs text-[#12181F] mt-2 leading-relaxed">{vuln.summary}</p>
        </div>
        <span className="text-[#8593A1] text-xs">{open?"−":"+"}</span>
      </button>
      {open && (
        <div className="border-t border-[#B7C3CB] px-3 py-3 space-y-2 bg-[#E3E9ED]">
          {vuln.aliases.length>0 && <div className="flex flex-wrap gap-1">{vuln.aliases.map(a=><span key={a} className="text-[10px] font-mono border border-[#B7C3CB] bg-white px-1.5 py-0.5">{a}</span>)}</div>}
          <p className="text-xs leading-relaxed text-[#12181F]">{vuln.summary}</p>
          {vuln.references.length>0 && <div className="space-y-1">{vuln.references.slice(0,3).map((r,i)=><a key={i} href={r.url} target="_blank" rel="noopener noreferrer" className="block text-xs font-mono text-[#1C4FB8] underline truncate">{r.url}</a>)}</div>}
        </div>
      )}
    </div>
  );
}
