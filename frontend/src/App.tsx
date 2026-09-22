import { useState, useEffect } from "react";
import type { ScanResponse, ScanResult } from "./types";
import { fetchFixedPackageJson, fetchExport, saveScan, authAnonymous, authMe, clearToken, getToken } from "./api/client";
import { Navbar } from "./components/Navbar";
import { Hero } from "./components/Hero";
import { ScanForm } from "./components/ScanForm";
import { StatsCards } from "./components/StatsCards";
import { ResultsDashboard } from "./components/ResultsDashboard";
import { SeverityChart } from "./components/SeverityChart";
import { CopyButton } from "./components/CopyButton";
import { HistoryDashboard } from "./components/HistoryDashboard";
import { NewsFeed } from "./components/NewsFeed";
import { Features } from "./components/Features";
import { Footer } from "./components/Footer";
import { About } from "./components/About";
import { VulnDetail } from "./components/VulnDetail";
import { ScanningRadar } from "./components/ScanningRadar";
import { AuthModal } from "./components/AuthModal";
import { ProfileModal } from "./components/ProfileModal";
import type { ScanProgressEvent } from "./types";

export default function App() {
  const [scanResult, setScanResult] = useState<ScanResponse | null>(null);
  const [packageJsonValue, setPackageJsonValue] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAbout, setShowAbout] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showNews, setShowNews] = useState(false);
  const [showFeatures, setShowFeatures] = useState(false);
  const [fixedJson, setFixedJson] = useState<string | null>(null);
  const [exportFormat, setExportFormat] = useState("spdx");
  const [exportContent, setExportContent] = useState<string | null>(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [selectedResult, setSelectedResult] = useState<ScanResult | null>(null);
  const [auth, setAuth] = useState<{ email: string; isAnonymous: boolean; credits: number } | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [authMessage, setAuthMessage] = useState<string | undefined>(undefined);
  const [authTab, setAuthTab] = useState<"login" | "register">("register");
  const [showProfile, setShowProfile] = useState(false);
  const [scanProgress, setScanProgress] = useState<{ done: number; total: number } | null>(null);
  const [scanLog, setScanLog] = useState<string[]>([]);

  const handleProgress = (ev: ScanProgressEvent) => {
    if (ev.event === "started") { setScanProgress({ done: 0, total: ev.total ?? 0 }); setScanLog([]); }
    else if (ev.event === "progress") {
      setScanProgress((p) => ({ done: (p?.done ?? 0) + 1, total: p?.total ?? ev.total ?? (p?.done ?? 0) + 1 }));
      setScanLog((prev) => { const line = `${ev.package}@${ev.version ?? ""} → ${ev.status ?? "ok"}${(ev.vulnerabilities ?? 0) > 0 ? ` (${ev.vulnerabilities} vuln)` : ""}`; return [...prev, line].slice(-6); });
    } else if (ev.event === "done" || ev.event === "error") { setScanProgress(null); setScanLog([]); }
  };

  const refreshAuth = async () => {
    try { const me = await authMe(); setAuth({ email: me.email, isAnonymous: me.is_anonymous, credits: me.credits.credits }); }
    catch { setAuth(null); }
  };
  useEffect(() => { const init = async () => { if (!getToken()) { try { await authAnonymous(); } catch {} } refreshAuth(); }; init(); }, []);
  useEffect(() => {
    if (!scanResult) { setFixedJson(null); setExportContent(null); return; }
    if (scanResult.fixes.length > 0 && packageJsonValue) { fetchFixedPackageJson(packageJsonValue, scanResult.fixes).then((r) => setFixedJson(r.fixed_package_json)).catch(() => {}); }
    saveScan(scanResult.results, scanResult.summary, scanResult.fixes).catch(() => {});
  }, [scanResult, packageJsonValue]);
  const handleExport = async (fmt: string) => {
    if (!scanResult) return; setExportLoading(true); setExportFormat(fmt);
    try { const content = await fetchExport(scanResult.results, scanResult.summary, fmt); setExportContent(content); } catch (e) { console.error("Export failed:", e); } finally { setExportLoading(false); }
  };
  const handleAuth = async () => { await refreshAuth(); setError(null); };
  const handleLogout = async () => { clearToken(); try { await authAnonymous(); } catch {} refreshAuth(); };
  const openAuth = (tab: "login" | "register" = "register", msg?: string) => { setAuthTab(tab); setAuthMessage(msg); setShowAuth(true); };
  const goHome = () => { setShowHistory(false); setShowNews(false); setShowAbout(false); setShowFeatures(false); };
  const activeView = showHistory ? "history" : showNews ? "news" : showFeatures ? "features" : showAbout ? "about" : scanResult ? "scan" : "landing";
  const isLimitError = !!(error && /Scan limit reached|429|Credits remaining: 0/i.test(error));

  useEffect(() => { if (isLimitError) openAuth("register", error!); }, [isLimitError]);

  // route content — header and frame remain static, only this main swaps with transition
  const renderRoute = () => {
    if (showHistory) return (
      <div key="history" className="animate-slide-up" style={{animationDuration:"var(--dur-base)"}}>
        <section className="sheet">
          <div className="sheet-head"><span className="sheet-num">SHEET 06</span><h2>Scan History</h2></div>
          <p className="sheet-intro">Every scan persisted locally — reload a previous result without re-querying the index.</p>
          <HistoryDashboard onLoad={(id) => console.log("Load scan", id)} />
        </section>
      </div>
    );
    if (showNews) return (
      <div key="news" className="animate-slide-up" style={{animationDuration:"var(--dur-base)"}}>
        <section className="sheet">
          <div className="sheet-head"><span className="sheet-num">SHEET 06</span><h2>Live advisory index</h2></div>
          <p className="sheet-intro">Pulled from the GitHub Advisory Database and cached for five minutes, refreshed on every scan request.</p>
          <NewsFeed />
        </section>
      </div>
    );
    if (showFeatures) return (
      <div key="features" className="animate-slide-up" style={{animationDuration:"var(--dur-base)"}}>
        <section className="sheet">
          <div className="sheet-head"><span className="sheet-num">SHEET 06</span><h2>System interfaces</h2></div>
          <p className="sheet-intro">One scan engine, four surfaces.</p>
          <Features />
        </section>
      </div>
    );
    if (showAbout) return (
      <div key="about" className="animate-slide-up" style={{animationDuration:"var(--dur-base)"}}>
        <section className="sheet">
          <div className="sheet-head"><span className="sheet-num">SHEET 06</span><h2>About Cipher</h2></div>
          <About onClose={() => setShowAbout(false)} />
        </section>
      </div>
    );
    // default landing + scan route
    return (
      <div key={scanResult ? "scan-result" : "landing"} >
        {!scanResult && !loading && <Hero />}
        {/* scan intake sheet */}
        <section className="sheet" id="scan">
          <div className="sheet-head"><span className="sheet-num">SHEET 06</span><h2>Scan intake</h2></div>
          <p className="sheet-intro">Paste a manifest, upload a file, or point at a raw URL. Lock files take precedence for exact versions. No API key required.</p>
          <ScanForm onResult={(res, pkgJson) => { setScanResult(res); setPackageJsonValue(pkgJson ?? null); }} onLoading={setLoading} onError={setError} onProgress={handleProgress} hasResult={scanResult !== null} />
          {loading && (
            <div className="mt-6 border border-[var(--rule-strong)] bg-[var(--paper-2)] p-6 text-center">
              <div className="mb-3 flex justify-center"><ScanningRadar /></div>
              <p className="font-mono text-xs font-semibold"><span className="text-[var(--red)]">$</span> scanning dependencies...</p>
              {scanProgress && (
                <div className="w-full max-w-md mx-auto mt-4">
                  <div className="flex justify-between text-[11px] font-mono text-[var(--ink-dim)] mb-1"><span>packages scanned</span><span className="text-[var(--ink)] font-bold">{scanProgress.done}/{scanProgress.total}</span></div>
                  <div className="h-2 bg-white border border-[var(--rule-strong)] overflow-hidden"><div className="h-full bg-[var(--ink)]" style={{ width: `${scanProgress.total>0?Math.round((scanProgress.done/scanProgress.total)*100):0}%`, transition:`width var(--dur-base) var(--ease)` }} /></div>
                  {scanLog.length>0 && <div className="mt-2 space-y-1 text-left">{scanLog.map((line,i)=><p key={i} className="text-[11px] font-mono text-[var(--ink-dim)]">{line}</p>)}</div>}
                </div>
              )}
              <p className="text-[11px] font-mono text-[var(--ink-faint)] mt-2">[querying osv.dev for known vulnerabilities]</p>
            </div>
          )}
          {error && (
            <div className="mt-6 classified" style={{padding:"22px 18px"}}>
              <span className="stamp">LIMIT REACHED</span>
              <p className="font-mono text-sm mt-3" style={{color:"var(--paper)"}}><span className="text-[var(--red)] font-bold">[ERROR]</span> {error}</p>
              <p className="font-mono text-xs mt-2" style={{color:"#AEB9C4"}}>Anonymous scans are capped at 5. Create an account for unlimited scans — the index stays the same, only the quota changes.</p>
              <div className="mt-4 flex gap-2">
                <button onClick={() => openAuth("register", error!)} className="btn">Create Account — Unlimited scans</button>
                <button onClick={() => setError(null)} className="btn btn-outline" style={{background:"transparent", color:"var(--paper)", borderColor:"var(--paper)"}}>Dismiss</button>
              </div>
            </div>
          )}
        </section>
        {scanResult && !loading && (
          <div className="animate-slide-up" style={{animationDuration:"var(--dur-base)"}}>
            <section className="sheet">
              <div className="sheet-head"><span className="sheet-num">SHEET 07</span><h2>Results</h2></div>
              <div className="stat-strip" style={{borderTop:"1px solid var(--rule-strong)", borderLeft:"1px solid var(--rule-strong)", borderRight:"1px solid var(--rule-strong)", borderBottom:"none"}}>
                <div className="stat-cell"><div className="n">{scanResult.summary.total_packages}</div><div className="l">packages scanned</div></div>
                <div className="stat-cell"><div className="n" style={{color: scanResult.summary.vulnerable_packages>0 ? "var(--red)" : undefined}}>{scanResult.summary.vulnerable_packages}</div><div className="l">vulnerable packages</div></div>
                <div className="stat-cell"><div className="n">{scanResult.summary.total_vulnerabilities}</div><div className="l">total vulnerabilities</div></div>
                <div className="stat-cell"><div className="n">{scanResult.summary.severity_breakdown.critical}</div><div className="l">critical</div></div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                <StatsCards summary={scanResult.summary} />
                <SeverityChart breakdown={scanResult.summary.severity_breakdown} />
              </div>
              {fixedJson && (
                <div className="mt-6 space-y-4">
                  <h3 className="font-mono text-xs tracking-[0.04em] text-[var(--ink-faint)] font-semibold">FIXES</h3>
                  <div className="border border-[var(--rule-strong)] bg-[var(--paper-2)] p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-mono text-xs font-semibold">Run these commands to apply fixes</span>
                      <CopyButton content={scanResult.fixes.map((f) => `npm install ${f.package_name}@${f.recommended_version}`).join("\n")} />
                    </div>
                    <div className="space-y-1 font-mono text-xs">
                      {scanResult.fixes.map((f) => (
                        <div key={f.package_name} className="flex items-center gap-2 flex-wrap">
                          <span className="text-[var(--ink-faint)]">$</span><span>npm install</span><span style={{color:"var(--red)", fontWeight:600}}>{f.package_name}</span><span>@</span><span style={{color:"var(--sev-low)", fontWeight:600}}>{f.recommended_version}</span>
                          {f.risk && <span className="text-[10px] border border-[var(--rule)] px-1.5 py-0.5">{f.risk_label || f.risk}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                  <details className="border border-[var(--rule-strong)]">
                    <summary className="px-4 py-2.5 font-mono text-xs cursor-pointer bg-[var(--paper-2)] border-b border-[var(--rule)]">Fixed package.json — click to expand</summary>
                    <div className="bg-white p-4"><pre className="text-xs font-mono whitespace-pre-wrap break-all">{fixedJson}</pre><div className="mt-2 flex justify-end"><CopyButton content={fixedJson} /></div></div>
                  </details>
                </div>
              )}
              <div className="mt-6 border border-[var(--rule-strong)] bg-[var(--paper-2)] p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-mono text-xs tracking-[0.04em] text-[var(--ink-faint)] font-semibold">EXPORT</h4>
                  <div className="flex gap-1">
                    {["spdx","cyclonedx","sarif","csv"].map((fmt) => (
                      <button key={fmt} onClick={() => handleExport(fmt)} disabled={exportLoading} className={exportContent && exportFormat===fmt ? "btn" : "btn btn-outline"} style={{padding:"4px 8px", fontSize:"11px"}}>{fmt.toUpperCase()}</button>
                    ))}
                  </div>
                </div>
                {exportContent && <pre className="p-3 text-xs font-mono bg-white border border-[var(--rule-strong)] max-h-80 overflow-auto whitespace-pre-wrap break-all">{exportContent}</pre>}
              </div>
            </section>
            <section className="sheet">
              <ResultsDashboard results={scanResult.results} onSelectResult={setSelectedResult} />
            </section>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col" style={{overflow:"visible"}}>
      <div className="frame" aria-hidden="true"><i className="tl"/><i className="tr"/><i className="bl"/><i className="br"/></div>
      <Navbar onAbout={() => setShowAbout(true)} onFeatures={() => setShowFeatures(true)} onHistory={() => { setShowHistory(true); setShowNews(false); setShowAbout(false); setShowFeatures(false); }} onNews={() => { setShowNews(true); setShowHistory(false); setShowAbout(false); setShowFeatures(false); }} activeView={activeView} auth={auth} onLogin={() => openAuth("login")} onRegister={() => openAuth("register")} onLogout={handleLogout} onProfile={() => setShowProfile(true)} />
      <div className="wrap flex-1 w-full" style={{overflow:"visible"}}>
        {/* page transition — only main content animates, header/frame stay static */}
        <main key={activeView} className="page-enter-active" style={{animation:`slide-up var(--dur-base) var(--ease)`}}>
          {renderRoute()}
        </main>
        <Footer onAbout={() => setShowAbout(true)} />
      </div>
      {selectedResult && <VulnDetail result={selectedResult} onClose={() => setSelectedResult(null)} fix={scanResult?.fixes.find((f) => f.package_name === selectedResult.package.name)} />}
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} onAuth={handleAuth} initialTab={authTab} message={authMessage} />}
      {showProfile && auth && !auth.isAnonymous && <ProfileModal email={auth.email} onClose={() => setShowProfile(false)} onDeleted={() => { setShowProfile(false); setAuth(null); clearToken(); try { void authAnonymous(); } catch {} refreshAuth(); }} />}
    </div>
  );
}
