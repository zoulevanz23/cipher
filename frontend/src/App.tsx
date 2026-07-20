import { useState, useEffect } from "react";
import type { ScanResponse, ScanResult } from "./types";
import { fetchFixedPackageJson, fetchExport, saveScan } from "./api/client";
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

  useEffect(() => {
    if (!scanResult) { setFixedJson(null); setExportContent(null); return; }

    if (scanResult.fixes.length > 0 && packageJsonValue) {
      fetchFixedPackageJson(packageJsonValue, scanResult.fixes)
        .then((r) => setFixedJson(r.fixed_package_json))
        .catch(() => {});
    }

    saveScan(scanResult.results, scanResult.summary, scanResult.fixes).catch(() => {});
  }, [scanResult, packageJsonValue]);

  const handleExport = async (fmt: string) => {
    if (!scanResult) return;
    setExportLoading(true);
    setExportFormat(fmt);
    try {
      const content = await fetchExport(scanResult.results, scanResult.summary, fmt);
      setExportContent(content);
    } catch (e) {
      console.error("Export failed:", e);
    } finally {
      setExportLoading(false);
    }
  };

  const goHome = () => { setShowHistory(false); setShowNews(false); setShowAbout(false); setShowFeatures(false); };
  const activeView = showHistory ? "history" : showNews ? "news" : showFeatures ? "features" : showAbout ? "about" : scanResult ? "scan" : "";

  const showView = (view: string) => {
    setShowHistory(view === "history");
    setShowNews(view === "news");
    setShowFeatures(view === "features");
    setShowAbout(view === "about");
  };

  if (showHistory) {
    return (
      <div className="min-h-screen flex flex-col scanline-overlay">
        <Navbar
          onHome={goHome}
          onAbout={() => showView("about")}
          onHistory={goHome}
          onNews={() => showView("news")}
          onFeatures={() => showView("features")}
          activeView="history"
        />
        <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 pt-8 w-full">
          <button onClick={goHome} className="text-xs font-mono text-gray-500 hover:text-accent transition-colors mb-6 flex items-center gap-1.5 px-3 py-2 -ml-3 rounded-lg hover:bg-surface-2/50 cursor-pointer select-none">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            back to scan
          </button>
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span className="text-gray-400 font-mono text-sm mr-1">$</span>
            Scan History
          </h2>
          <HistoryDashboard onLoad={(id) => console.log("Load scan", id)} />
        </main>
        <Footer onAbout={() => showView("about")} />
      </div>
    );
  }

  if (showNews) {
    return (
      <div className="min-h-screen flex flex-col scanline-overlay">
        <Navbar
          onHome={goHome}
          onAbout={() => showView("about")}
          onHistory={() => showView("history")}
          onNews={goHome}
          onFeatures={() => showView("features")}
          activeView="news"
        />
        <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 pt-8 w-full">
          <button onClick={goHome} className="text-xs font-mono text-gray-500 hover:text-accent transition-colors mb-6 flex items-center gap-1.5 px-3 py-2 -ml-3 rounded-lg hover:bg-surface-2/50 cursor-pointer select-none">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            back to scan
          </button>
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-gray-400 font-mono text-sm mr-1">$</span>
            Security News
          </h2>
          <NewsFeed />
        </main>
        <Footer onAbout={() => showView("about")} />
      </div>
    );
  }

  if (showFeatures) {
    return (
      <div className="min-h-screen flex flex-col scanline-overlay">
        <Navbar
          onHome={goHome}
          onAbout={() => showView("about")}
          onHistory={() => showView("history")}
          onNews={() => showView("news")}
          onFeatures={goHome}
          activeView="features"
        />
        <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 pt-8 w-full">
          <button onClick={goHome} className="text-xs font-mono text-gray-500 hover:text-accent transition-colors mb-6 flex items-center gap-1.5 px-3 py-2 -ml-3 rounded-lg hover:bg-surface-2/50 cursor-pointer select-none">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            back to scan
          </button>
          <h2 className="text-xl font-bold mb-8 flex items-center gap-2">
            <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-gray-400 font-mono text-sm mr-1">$</span>
            Features
          </h2>
          <Features />
        </main>
        <Footer onAbout={() => showView("about")} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col scanline-overlay">
      <Navbar
        onAbout={() => setShowAbout(true)}
        onFeatures={() => setShowFeatures(true)}
        onHistory={() => { setShowHistory(true); setShowNews(false); setShowAbout(false); setShowFeatures(false); }}
        onNews={() => { setShowNews(true); setShowHistory(false); setShowAbout(false); setShowFeatures(false); }}
        activeView={activeView}
      />
      <main className="flex-1">
        {!scanResult && !loading && <Hero />}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <ScanForm
            onResult={(res, pkgJson) => { setScanResult(res); setPackageJsonValue(pkgJson ?? null); }}
            onLoading={setLoading}
            onError={setError}
            hasResult={scanResult !== null}
          />
          {loading && (
            <div className="flex flex-col items-center justify-center py-24 animate-slide-up">
              <div className="mb-6">
                <ScanningRadar />
              </div>
              <p className="text-lg font-mono text-gray-300">
                <span className="text-accent">$</span> scanning dependencies...
              </p>
              <p className="text-sm text-gray-600 font-mono mt-1">
                [querying osv.dev for known vulnerabilities]
              </p>
            </div>
          )}
          {error && (
            <div className="animate-slide-up mt-8 p-4 rounded-xl bg-critical/10 border border-critical/20 text-critical text-center font-mono text-sm">
              <span className="text-critical">[ERROR]</span> {error}
            </div>
          )}
          {scanResult && !loading && (
            <div className="animate-slide-up space-y-8 mt-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <StatsCards summary={scanResult.summary} />
                <SeverityChart breakdown={scanResult.summary.severity_breakdown} />
              </div>

              {fixedJson && (
                <>
                  <div className="bg-surface-2/50 border border-emerald-500/20 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-mono text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Run these commands to apply fixes
                      </h4>
                      <CopyButton content={scanResult.fixes.map((f) => `npm install ${f.package_name}@${f.recommended_version}`).join("\n")} />
                    </div>
                    <div className="space-y-1.5">
                      {scanResult.fixes.map((f) => (
                        <div key={f.package_name} className="flex items-center gap-3 text-sm font-mono">
                          <span className="text-gray-500">$</span>
                          <span className="text-gray-300">npm install</span>
                          <span className="text-amber-300">{f.package_name}</span>
                          <span className="text-gray-500">@</span>
                          <span className="text-emerald-400">{f.recommended_version}</span>
                          {f.risk && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono border ${
                              f.risk === "safe" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                              f.risk === "minor" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                              f.risk === "major" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                              "bg-gray-500/10 text-gray-400 border-gray-500/20"
                            }`}>
                              {f.risk_label || f.risk}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <details className="group bg-surface-2/50 border border-border rounded-xl overflow-hidden">
                    <summary className="flex items-center justify-between px-5 py-3 cursor-pointer text-sm font-mono text-gray-300 hover:bg-surface-2/80 transition-colors">
                      <span className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Fixed package.json
                      </span>
                      <span className="text-xs text-gray-500">click to expand</span>
                    </summary>
                    <div className="border-t border-border">
                      <div className="flex justify-end px-4 pt-2">
                        <CopyButton content={fixedJson} />
                      </div>
                      <pre className="p-4 text-xs leading-relaxed overflow-x-auto max-h-96 bg-surface-2 font-mono text-gray-400 whitespace-pre-wrap break-all">{fixedJson}</pre>
                    </div>
                  </details>
                </>
              )}

              <div className="bg-surface-2/50 border border-border rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-mono text-gray-500 uppercase tracking-wider flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Export
                  </h4>
                  <div className="flex items-center gap-2">
                    {["spdx", "cyclonedx", "sarif", "csv"].map((fmt) => (
                      <button
                        key={fmt}
                        onClick={() => handleExport(fmt)}
                        disabled={exportLoading}
                        className={`text-xs font-mono px-2.5 py-1 rounded-lg border transition-all ${
                          exportContent && exportFormat === fmt
                            ? "bg-accent/20 border-accent/40 text-accent"
                            : "border-border text-gray-500 hover:text-gray-300 hover:border-gray-500"
                        }`}
                      >
                        {fmt.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
                {exportContent && (
                  <details className="group" open>
                    <summary className="text-xs font-mono text-gray-600 cursor-pointer hover:text-gray-400 transition-colors mb-2">
                      {exportLoading ? "Generating..." : "click to collapse"}
                    </summary>
                    <pre className="p-3 text-xs leading-relaxed overflow-x-auto max-h-80 bg-surface-2 rounded-lg font-mono text-gray-400 whitespace-pre-wrap break-all">{exportContent}</pre>
                  </details>
                )}
              </div>

              <ResultsDashboard results={scanResult.results} onSelectResult={setSelectedResult} />
            </div>
          )}
        </section>
      </main>
      <Footer onAbout={() => setShowAbout(true)} />
      {showAbout && <About onClose={() => setShowAbout(false)} />}
      {selectedResult && (
        <VulnDetail
          result={selectedResult}
          onClose={() => setSelectedResult(null)}
          fix={scanResult?.fixes.find((f) => f.package_name === selectedResult.package.name)}
        />
      )}
    </div>
  );
}
