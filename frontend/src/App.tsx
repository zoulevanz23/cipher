import { useState } from "react";
import type { ScanResponse } from "./types";
import { Navbar } from "./components/Navbar";
import { Hero } from "./components/Hero";
import { ScanForm } from "./components/ScanForm";
import { StatsCards } from "./components/StatsCards";
import { ResultsDashboard } from "./components/ResultsDashboard";
import { Footer } from "./components/Footer";
import { About } from "./components/About";

export default function App() {
  const [scanResult, setScanResult] = useState<ScanResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAbout, setShowAbout] = useState(false);

  return (
    <div className="min-h-screen flex flex-col scanline-overlay">
      <Navbar onAbout={() => setShowAbout(true)} />
      <main className="flex-1">
        {!scanResult && !loading && <Hero />}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <ScanForm
            onResult={(res) => setScanResult(res)}
            onLoading={setLoading}
            onError={setError}
            hasResult={scanResult !== null}
          />
          {loading && (
            <div className="flex flex-col items-center justify-center py-24 animate-slide-up">
              <div className="relative w-20 h-20 mb-6">
                <div className="absolute inset-0 rounded-full border-4 border-surface-2" />
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-accent scan-gradient animate-spin" />
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-b-accent scan-gradient animate-spin" style={{ animationDirection: "reverse", animationDuration: "0.8s" }} />
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
              <StatsCards summary={scanResult.summary} />
              <ResultsDashboard results={scanResult.results} />
            </div>
          )}
        </section>
      </main>
      <Footer onAbout={() => setShowAbout(true)} />
      {showAbout && <About onClose={() => setShowAbout(false)} />}
    </div>
  );
}
