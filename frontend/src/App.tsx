import { useState, useEffect } from "react";
import type { ScanResponse, ScanResult } from "./types";
import { fetchExport, saveScan, authAnonymous, authMe, clearToken, getToken, getHistoryScan } from "./api/client";
import { Navbar } from "./components/Navbar";
import { LandingPage } from "./components/landing/LandingPage";
import { ScanToolSection } from "./components/landing/ScanToolSection";
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
import { AuthModal } from "./components/AuthModal";
import { ProfileModal } from "./components/ProfileModal";
import { toast } from "./components/Toast";
import type { ScanProgressEvent } from "./types";

type View = "landing" | "scanner" | "results" | "history" | "news" | "features" | "about";

export default function App() {
  const [scanResult, setScanResult] = useState<ScanResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>("landing");
  const [exportLoading, setExportLoading] = useState(false);
  const [selectedResult, setSelectedResult] = useState<ScanResult | null>(null);
  const [auth, setAuth] = useState<{ email: string; isAnonymous: boolean; credits: number } | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [authTab, setAuthTab] = useState<"login" | "register">("register");
  const [showProfile, setShowProfile] = useState(false);
  const [scanProgress, setScanProgress] = useState<{ done: number; total: number } | null>(null);
  const [scanLog, setScanLog] = useState<string[]>([]);

  const go = (v: View) => setView(v);
  /* Footer anchor links work from any view: land first, then scroll. */
  const goLandingAnchor = (id: string) => {
    go("landing");
    setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }), 60);
  };

  const handleProgress = (ev: ScanProgressEvent) => {
    if (ev.event === "started") { setScanProgress({ done: 0, total: ev.total ?? 0 }); setScanLog([]); }
    else if (ev.event === "progress") {
      setScanProgress((p) => ({ done: (p?.done ?? 0) + 1, total: p?.total ?? ev.total ?? (p?.done ?? 0) + 1 }));
      setScanLog((prev) => { const line = `${ev.package}@${ev.version ?? ""} → ${ev.status ?? "ok"}${(ev.vulnerabilities ?? 0) > 0 ? ` (${ev.vulnerabilities} vuln)` : ""}`; return [...prev, line].slice(-6); });
    } else if (ev.event === "done" || ev.event === "error") { setScanProgress(null); setScanLog([]); }
  };

  const refreshAuth = async (retry = true) => {
    try {
      const me = await authMe();
      setAuth({ email: me.email, isAnonymous: me.is_anonymous, credits: me.credits.credits });
    } catch {
      // Stale/expired token: drop it and fall back to a fresh anonymous
      // session instead of leaving the user silently signed out.
      if (getToken() && retry) {
        clearToken();
        try { await authAnonymous(); toast("Session expired — fresh anonymous session"); }
        catch { /* offline: stay signed out */ }
        await refreshAuth(false);
      } else {
        setAuth(null);
      }
    }
  };
  useEffect(() => { const init = async () => { if (!getToken()) { try { await authAnonymous(); } catch {} } refreshAuth(); }; init(); }, []);
  useEffect(() => {
    if (!scanResult) return;
    saveScan(scanResult.results, scanResult.summary, scanResult.fixes).catch(() => {});
  }, [scanResult]);
  const handleExport = async (fmt: string) => {
    if (!scanResult) return; setExportLoading(true);
    try { await fetchExport(scanResult.results, scanResult.summary, fmt); } catch (e) { console.error("Export failed:", e); } finally { setExportLoading(false); }
  };
  /* Reopen a saved scan from the caller's own history into the results view. */
  const handleLoadHistory = async (id: number) => {
    try {
      const h = await getHistoryScan(id);
      const results = h.results_json ? JSON.parse(h.results_json) : [];
      const fixes = h.fixes_json ? JSON.parse(h.fixes_json) : [];
      setScanResult({
        summary: {
          total_packages: h.total_packages,
          vulnerable_packages: h.vulnerable_packages,
          total_vulnerabilities: h.total_vulnerabilities,
          severity_breakdown: { critical: h.critical, high: h.high, medium: h.medium, low: h.low },
        },
        results,
        fixes,
      });
      go("results");
      toast(`Loaded scan from ${h.timestamp.slice(0, 10)}`);
    } catch (e: any) {
      toast(typeof e?.message === "string" ? e.message.slice(0, 200) : "Could not load scan.");
    }
  };
  const handleAuth = async () => { await refreshAuth(); setError(null); };
  const handleLogout = async () => {
    clearToken();
    try { await authAnonymous(); toast("Signed out — fresh anonymous session"); }
    catch { toast("Sign-out failed — server unreachable"); }
    refreshAuth();
  };
  const handleProfile = () => {
    if (auth && !auth.isAnonymous) setShowProfile(true);
    else openAuth("register");
  };
  const openAuth = (tab: "login" | "register" = "register") => { setAuthTab(tab); setShowAuth(true); };
  const activeView = view === "landing" ? (scanResult ? "scan" : "landing") : view;
  const isLimitError = !!(error && /Scan limit reached|429|Credits remaining: 0/i.test(error));

  useEffect(() => { if (isLimitError) openAuth("register"); }, [isLimitError]);

  const renderRoute = () => {
    if (view === "history") return (
      <div key="history">
        <HistoryDashboard onLoad={handleLoadHistory} />
      </div>
    );
    if (view === "news") return (
      <div key="news">
        <NewsFeed />
      </div>
    );
    if (view === "features") return (
      <div key="features">
        <Features />
      </div>
    );
    if (view === "about") return (
      <div key="about">
        <About onClose={() => go("landing")} />
      </div>
    );
    if (view === "scanner") return (
      <div key="scanner">
        <ScanToolSection
          onScanResult={(res) => { setScanResult(res); if (res) go("results"); }}
          onLoading={setLoading}
          onError={setError}
          onProgress={handleProgress}
          hasResult={scanResult !== null}
          loading={loading}
          error={error}
          scanProgress={scanProgress}
          scanLog={scanLog}
          onClearError={() => setError(null)}
          onOpenAuth={() => openAuth("register")}
          onBack={() => go("landing")}
        />
      </div>
    );
    if (view === "results") {
      if (!scanResult || loading) return (
        <div key="results-empty" className="empty-state">
          <h2>No scan yet</h2>
          <p>Paste a manifest to run your first vulnerability scan.</p>
          <button onClick={() => go("landing")} className="btn btn-primary">Back to scanner</button>
        </div>
      );
      return (
        <div key="results">
          <div className="verdict-band verdict-glow">
            <div className={`v-icon ${scanResult.summary.total_vulnerabilities === 0 ? "pass" : "crit"}`}>
              {scanResult.summary.total_vulnerabilities === 0 ? "✓" : "!"}
            </div>
            <div className="v-body">
              <div className="v-head">{scanResult.summary.total_vulnerabilities === 0 ? "No vulnerabilities found" : "Vulnerabilities detected"}</div>
              <div className="v-meta">
                {scanResult.summary.total_packages} packages · {scanResult.summary.vulnerable_packages} vulnerable · {scanResult.summary.total_vulnerabilities} findings · {new Date().toLocaleDateString()}
              </div>
            </div>
          </div>
          <div className="panel">
            <div className="panel-header">Summary</div>
            <StatsCards summary={scanResult.summary} />
          </div>
          <div className="panel">
            <div className="panel-header">Severity Breakdown</div>
            <SeverityChart breakdown={scanResult.summary.severity_breakdown} />
          </div>
          {scanResult.fixes.length > 0 && (
            <div className="panel">
              <div className="panel-header">Fixes · {scanResult.fixes.length} available</div>
              <div className="space-y-2 font-mono text-xs">
                {scanResult.fixes.map((f) => {
                  const rc = f.risk === "safe" ? "var(--pass)" : f.risk === "minor" ? "var(--warn)" : "var(--crit)";
                  return (
                    <div key={f.package_name} className="flex items-center gap-2" style={{ flexWrap: "wrap" }}>
                      <span style={{ color: "var(--ink)", fontWeight: 600 }}>{f.package_name}</span>
                      <span style={{ color: "var(--muted2)" }}>{f.current_version} →</span>
                      <span style={{ color: "var(--pass)", fontWeight: 600 }}>{f.recommended_version}</span>
                      {f.risk && (
                        <span style={{ fontSize: "10px", fontWeight: 600, color: rc, border: `1px solid ${rc}`, opacity: 0.9, borderRadius: "4px", padding: "1px 6px", background: "transparent" }}>
                          {(f.risk_label || f.risk).toUpperCase()}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="mt-3"><CopyButton content={scanResult.fixes.map((f) => `npm install ${f.package_name}@${f.recommended_version}`).join("\n")} /></div>
            </div>
          )}
          <div className="panel">
            <div className="panel-header">Export</div>
            <div className="flex gap-2">
              {["spdx","cyclonedx","sarif","csv"].map((fmt) => (
                <button key={fmt} onClick={() => handleExport(fmt)} disabled={exportLoading} className="btn btn-sm">{fmt.toUpperCase()}</button>
              ))}
            </div>
          </div>
          <div className="panel">
            <div className="panel-header">Results</div>
            <ResultsDashboard results={scanResult.results} onSelectResult={setSelectedResult} />
          </div>
        </div>
      );
    }
    // default landing route: marketing page (scanner lives on its own page)
    return (
      <div key="landing">
        <LandingPage onRunScan={() => go("scanner")} />
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar
        onHome={() => go("landing")}
        onAbout={() => go("about")}
        onFeatures={() => go("features")}
        onHistory={() => go("history")}
        onNews={() => go("news")}
        onScanner={() => go("scanner")}
        onResults={() => go("results")}
        activeView={activeView}
        auth={auth}
        onLogout={handleLogout}
        onProfile={handleProfile}
        onSignIn={() => openAuth("login")}
      />
      <main className="page-shell" style={{paddingTop:"64px", paddingBottom:"48px", flex:1}}>
        {renderRoute()}
      </main>
      <Footer onFeatures={() => go("features")} onHistory={() => go("history")} onNews={() => go("news")} onAbout={() => go("about")} onScanTool={() => go("scanner")} onAnchor={goLandingAnchor} />
      {selectedResult && <VulnDetail result={selectedResult} onClose={() => setSelectedResult(null)} fix={scanResult ? scanResult.fixes.find((f) => f.package_name === selectedResult.package.name) : undefined} />}
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} onAuth={handleAuth} initialTab={authTab} />}
      {showProfile && auth && !auth.isAnonymous && <ProfileModal email={auth.email} onClose={() => setShowProfile(false)} onDeleted={() => { setShowProfile(false); setAuth(null); clearToken(); try { void authAnonymous(); } catch {} refreshAuth(); }} />}
    </div>
  );
}
