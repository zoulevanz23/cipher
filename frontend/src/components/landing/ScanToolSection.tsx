import { useEffect, useState } from "react";
import { ScanForm } from "../ScanForm";
import { ScanningRadar } from "../ScanningRadar";
import type { ScanProgressEvent, ScanResponse } from "../../types";
import { useInView } from "./hooks";

/* Live scan tool: the REAL product intake (same ScanForm, same tabs,
   same execute flow) — not a mock. Adds a one-shot scan-line sweep
   over the input on execute plus a mini pipeline strip that lights
   stages in sequence, tying the diagram to the action. First viewport
   entry also triggers ScanForm's one-time example typing. */

const STEPS = ["MANIFEST", "PARSER", "SOURCES", "CVSS", "OUTPUT"];

interface Props {
  onScanResult: (res: ScanResponse | null, pkgJson?: string) => void;
  onLoading: (v: boolean) => void;
  onError: (err: string | null) => void;
  onProgress?: (ev: ScanProgressEvent) => void;
  hasResult: boolean;
  loading: boolean;
  error: string | null;
  scanProgress: { done: number; total: number } | null;
  scanLog: string[];
  onClearError: () => void;
  onOpenAuth: () => void;
  onBack: () => void;
}

export function ScanToolSection(p: Props) {
  const [sweepKey, setSweepKey] = useState(0);
  const [litStep, setLitStep] = useState(-1);
  const [typeSignal, setTypeSignal] = useState(0);
  const { ref, inView } = useInView<HTMLElement>(0.25);

  // Typing runs once per session (ScanForm guards with a module flag).
  useEffect(() => { if (inView) setTypeSignal((s) => (s === 0 ? 1 : s)); }, [inView]);

  // Sweep fires on every execute.
  useEffect(() => { if (p.loading) setSweepKey((k) => k + 1); }, [p.loading]);

  // Mini pipeline lights stages in sequence while scanning.
  useEffect(() => {
    if (!p.loading) {
      const t = setTimeout(() => setLitStep(-1), 900);
      return () => clearTimeout(t);
    }
    const timers = STEPS.map((_, i) => setTimeout(() => setLitStep(i), i * 180));
    return () => timers.forEach(clearTimeout);
  }, [p.loading]);

  return (
    <section ref={ref} id="scan-tool" style={{ scrollMarginTop: "72px" }}>
      <button onClick={p.onBack} style={{ background: "transparent", border: "none", padding: 0, marginBottom: "16px", fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--muted)", cursor: "pointer" }}
        onMouseEnter={(e) => { e.currentTarget.style.color = "var(--ink)"; }} onMouseLeave={(e) => { e.currentTarget.style.color = "var(--muted)"; }}>
        ← Back
      </button>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--muted)", letterSpacing: "0.06em", marginBottom: "8px" }}>LIVE SCAN</div>
      <h2 style={{ fontFamily: "var(--font-sans)", fontSize: "24px", fontWeight: 700, color: "var(--ink)", margin: "0 0 8px" }}>Run it right here.</h2>
      <p style={{ fontFamily: "var(--font-sans)", fontSize: "15px", color: "var(--muted)", margin: "0 0 20px" }}>This is the real intake — paste a manifest and it scans against OSV.dev, NVD, and GHSA.</p>

      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "12px", fontFamily: "var(--font-mono)", fontSize: "11px" }}>
        {STEPS.map((s, i) => (
          <span key={s} style={{
            padding: "4px 10px", borderRadius: "4px",
            border: `1px solid ${i <= litStep ? "var(--pass)" : "var(--line)"}`,
            color: i <= litStep ? "var(--pass)" : "var(--muted2)",
            background: "transparent",
          }}>{s}</span>
        ))}
      </div>

      <div className="panel">
        <div className="panel-header">Scan Intake</div>
        <div style={{ position: "relative" }}>
          <ScanForm
            onResult={p.onScanResult}
            onLoading={p.onLoading}
            onError={p.onError}
            onProgress={p.onProgress}
            hasResult={p.hasResult}
            autoTypeSignal={typeSignal}
          />
          {sweepKey > 0 && <div key={sweepKey} className="scan-sweep" />}
        </div>

        {p.loading && (
          <div className="panel mt-4" style={{ textAlign: "center" }}>
            <div className="mb-3 flex justify-center"><ScanningRadar /></div>
            <p className="font-mono text-xs" style={{ color: "var(--crit)" }}>$ scanning dependencies...</p>
            {p.scanProgress && (
              <div className="mt-4">
                <div className="flex justify-between font-mono text-xs mb-1" style={{ color: "var(--muted)" }}><span>packages scanned</span><span style={{ color: "var(--ink)" }}>{p.scanProgress.done}/{p.scanProgress.total}</span></div>
                <div style={{ height: "4px", background: "var(--line)", borderRadius: "2px", overflow: "hidden" }}><div style={{ height: "100%", background: "var(--pass)", borderRadius: "2px", width: `${p.scanProgress.total > 0 ? Math.round((p.scanProgress.done / p.scanProgress.total) * 100) : 0}%`, transition: `width var(--dur-base) var(--ease)` }} /></div>
                {p.scanLog.length > 0 && <div className="mt-2 space-y-1"><span className="font-mono text-xs" style={{ color: "var(--muted)" }}>[querying osv.dev for known vulnerabilities]</span></div>}
              </div>
            )}
          </div>
        )}
        {p.error && (
          <div className="mt-4 panel" style={{ borderColor: "rgba(255,92,92,.4)" }}>
            <div className="font-mono text-sm" style={{ color: "var(--crit)" }}>[ERROR] {p.error}</div>
            <div className="mt-3 flex gap-2">
              <button onClick={p.onOpenAuth} className="btn btn-primary btn-sm">Create account — unlimited scans</button>
              <button onClick={p.onClearError} className="btn btn-sm">Dismiss</button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
