import { useState, useEffect, useMemo } from "react";

interface NewsItem {
  id: string;
  summary: string;
  severity: string;
  published: string;
  url: string;
}

const SEVERITIES = ["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"];
const sevColor: Record<string,string> = { CRITICAL:"var(--crit)", HIGH:"var(--high)", MEDIUM:"var(--warn)", LOW:"var(--pass)" };
const sevBg: Record<string,string> = { CRITICAL:"rgba(255,92,92,.1)", HIGH:"rgba(255,138,92,.1)", MEDIUM:"rgba(245,196,83,.1)", LOW:"rgba(57,217,138,.1)" };

export function NewsFeed() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("ALL");

  useEffect(() => {
    fetch(`/api/news?limit=20`)
      .then((r) => r.json())
      .then(setNews)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return news.filter((item) => {
      const q = search.toLowerCase();
      if (q && !item.summary.toLowerCase().includes(q) && !item.id.toLowerCase().includes(q) && !item.severity.toLowerCase().includes(q)) return false;
      if (severityFilter !== "ALL" && item.severity !== severityFilter) return false;
      return true;
    });
  }, [news, search, severityFilter]);

  return (
    <div style={{display:"flex", flexDirection:"column", gap:"24px"}}>
      <div style={{display:"flex", flexWrap:"wrap", gap:"12px"}}>
        <div style={{flex:"1", minWidth:"200px", position:"relative"}}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search advisories…"
            style={{width:"100%", padding:"8px 12px", background:"var(--bg2)", border:"1px solid var(--line)", borderRadius:"4px", fontFamily:"var(--font-mono)", fontSize:"13px", color:"var(--ink)", outline:"none", boxSizing:"border-box"}}
          />
        </div>
        <div style={{display:"flex", gap:"4px"}}>
          {SEVERITIES.map((s)=>(
            <button key={s} onClick={()=>setSeverityFilter(s)} style={{padding:"6px 12px", background:severityFilter===s?"var(--line)":"transparent", color:severityFilter===s?"var(--ink)":"var(--muted)", fontFamily:"var(--font-mono)", fontSize:"12px", border:"1px solid var(--line)", borderRadius:"4px", cursor:"pointer", textTransform:"uppercase"}}>{s}</button>
          ))}
        </div>
      </div>

      <div style={{border:"1px solid var(--line)", borderRadius:"8px", overflow:"hidden"}}>
        <div style={{padding:"12px 16px", borderBottom:"1px solid var(--line)", display:"flex", alignItems:"center", justifyContent:"space-between"}}>
          <h4 style={{fontFamily:"var(--font-mono)", fontSize:"12px", color:"var(--ink)"}}>Security News</h4>
          <span style={{fontFamily:"var(--font-mono)", fontSize:"12px", color:"var(--muted)"}}>{filtered.length === 1 ? "1 advisory" : `${filtered.length} advisories`}</span>
        </div>

        {loading ? (
          <div style={{padding:"32px", textAlign:"center", fontFamily:"var(--font-mono)", fontSize:"12px", color:"var(--muted)"}}>Loading…</div>
        ) : filtered.length === 0 ? (
          news.length === 0 ? (
            <div style={{padding:"32px", textAlign:"center", fontFamily:"var(--font-mono)", fontSize:"13px", color:"var(--muted)"}}>
              No advisories available — the feed may be unreachable.
            </div>
          ) : (
            <div style={{padding:"32px", textAlign:"center", fontFamily:"var(--font-mono)", fontSize:"13px", color:"var(--muted)"}}>
              No advisories match your filter.
              <button onClick={()=>{setSearch("");setSeverityFilter("ALL")}} style={{marginLeft:"8px", color:"var(--muted)", textDecoration:"underline", background:"transparent", border:"none", cursor:"pointer", fontFamily:"var(--font-mono)", fontSize:"13px"}}>Clear</button>
            </div>
          )
        ) : (
          <div>
            {filtered.map((item)=>(
              <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer" style={{display:"block", padding:"12px 16px", borderBottom:"1px solid var(--line)", textDecoration:"none", color:"inherit", background:"transparent"}}
                onMouseEnter={(e)=>{e.currentTarget.style.background="rgba(255,255,255,.02)"}} onMouseLeave={(e)=>{e.currentTarget.style.background="transparent"}}>
                <div style={{display:"flex", alignItems:"start", justifyContent:"space-between", gap:"12px"}}>
                  <div style={{flex:"1", minWidth:"0"}}>
                    <div style={{display:"flex", alignItems:"center", gap:"6px", flexWrap:"wrap", marginBottom:"6px"}}>
                      <span style={{fontFamily:"var(--font-mono)", fontSize:"10px", fontWeight:600, padding:"2px 6px", background:sevBg[item.severity]||"rgba(255,255,255,.05)", color:sevColor[item.severity]||"var(--muted)", borderRadius:"3px", textTransform:"uppercase"}}>{item.severity}</span>
                      <span style={{fontFamily:"var(--font-mono)", fontSize:"10px", color:"var(--muted)"}}>{item.id}</span>
                      <span style={{fontFamily:"var(--font-mono)", fontSize:"10px", color:"var(--muted2)"}}>{item.published}</span>
                    </div>
                    <p style={{fontFamily:"var(--font-sans)", fontSize:"13px", color:"var(--muted)", lineHeight:1.5}}>{item.summary}</p>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
