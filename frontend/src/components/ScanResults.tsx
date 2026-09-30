// @ts-nocheck
import { useState, useMemo, useRef, useEffect } from "react";
import type { ScanResponse, ScanResult } from "../types";
import type { Fix } from "./FixPlanner";
import { simulateWhatIf } from "../api/client";
import { ScanForm } from "./ScanForm";
import "./scan-results.css";

function gradeFor(score: number): string {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 50) return "C";
  if (score >= 25) return "D";
  return "F";
}

function usePrefersReducedMotion() {
  const [r, setR] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return;
    setR(mq.matches);
    const fn = (e: MediaQueryListEvent) => setR(e.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);
  return r;
}

function inferPrefix(cmds: string[]): string {
  if (!cmds.length) return "npm install";
  const f = cmds[0].trim();
  if (f.startsWith("pip install")) return "pip install";
  if (f.startsWith("go get")) return "go get";
  if (f.startsWith("bundle")) return "bundle update";
  if (f.includes("mvn")) return "mvn install";
  if (f.startsWith("npm install") || f.startsWith("npm i ")) return "npm install";
  if (f.startsWith("yarn add")) return "yarn add";
  if (f.startsWith("pnpm add")) return "pnpm add";
  return "npm install";
}
function buildCombined(fixes: Fix[], checked: boolean[]): string {
  const sel = fixes.filter((_, i) => checked[i]);
  if (!sel.length) return "";
  const prefix = inferPrefix(sel.map((f) => f.command));
  const isPip = prefix.startsWith("pip");
  const isGo = prefix.startsWith("go get");
  return `${prefix} ${sel.map((f) => (isPip ? `${f.pkg}==${f.to.trim()}` : isGo ? `${f.pkg}@${f.to.trim()}` : `${f.pkg}@${f.to.trim()}`)).join(" ")}`;
}

const sevRank: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1, NONE: 0, UNKNOWN: 0 };

export function ScanResults({
  scan,
  packageJson,
  onScanNew,
  onExport,
  onSelectResult,
  onNewScan,
}: {
  scan: ScanResponse;
  packageJson?: string;
  onScanNew: () => void;
  onExport: (fmt: string) => void;
  onSelectResult?: (r: ScanResult) => void;
  onNewScan?: (res: ScanResponse, pkgJson?: string) => void;
}) {
  const reduced = usePrefersReducedMotion();
  const { summary, results, fixes: rawFixes } = scan;

  const healthOf = (r: ScanResult): number => {
    if (typeof r.health_score === "number") return r.health_score as number;
    let ded = 0;
    for (const v of r.vulnerabilities || []) {
      const s = (v.severity || "UNKNOWN").toUpperCase();
      if (s === "CRITICAL") ded += 20;
      else if (s === "HIGH") ded += 10;
      else if (s === "MEDIUM") ded += 5;
      else if (s === "LOW") ded += 2;
    }
    if ((r as any).unmaintained) ded += 15;
    return Math.max(0, Math.min(100, 100 - ded));
  };

  const baseScore = useMemo(() => {
    if (!results.length) return 0;
    const scores = results.map(healthOf);
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }, [results]);

  const fixes: Fix[] = useMemo(() => {
    return rawFixes.map((f: any) => {
      const match = results.find((r) => r.package.name === f.package_name);
      const sevRaw = (match?.max_severity || "HIGH").toLowerCase();
      const severity = (["critical", "high", "medium", "low"].includes(sevRaw) ? sevRaw : "high") as Fix["severity"];
      const cvss = match?.vulnerabilities?.[0]?.cvss_score ?? (severity === "critical" ? 9.1 : severity === "high" ? 7.5 : severity === "medium" ? 5.3 : 3.1);
      const riskRaw = (f.risk || f.risk_label || "").toLowerCase();
      const risk: Fix["risk"] = riskRaw.includes("major") ? "major" : riskRaw.includes("minor") ? "minor" : "patch";
      let vulnDed = 0;
      if (match) {
        for (const v of match.vulnerabilities || []) {
          const s = (v.severity || "UNKNOWN").toUpperCase();
          if (s === "CRITICAL") vulnDed += 20;
          else if (s === "HIGH") vulnDed += 10;
          else if (s === "MEDIUM") vulnDed += 5;
          else if (s === "LOW") vulnDed += 2;
        }
      }
      const curHealth = match ? healthOf(match) : 100;
      const points = Math.max(0, Math.min(vulnDed, 100 - curHealth));
      const eco = (f.ecosystem || "").toLowerCase();
      let cmd = "";
      if (eco.includes("pip") || eco === "pypi") cmd = `pip install ${f.package_name}==${f.recommended_version}`;
      else if (eco.includes("go")) cmd = `go get ${f.package_name}@${f.recommended_version}`;
      else if (eco.includes("maven")) cmd = `mvn install ${f.package_name}:${f.recommended_version}`;
      else if (eco.includes("bundler") || eco.includes("gem")) cmd = `bundle update ${f.package_name}`;
      else cmd = `npm install ${f.package_name}@${f.recommended_version}`;
      return {
        pkg: f.package_name,
        from: f.current_version,
        to: f.recommended_version,
        severity,
        cvss: Math.round((cvss as number) * 10) / 10,
        risk,
        points,
        command: cmd,
      };
    });
  }, [rawFixes, results]);

  const [checked, setChecked] = useState<boolean[]>(() => fixes.map((f) => f.risk !== "major"));
  useEffect(() => setChecked(fixes.map((f) => f.risk !== "major")), [fixes]);

  const projected = useMemo(() => {
    if (!results.length) return baseScore;
    const selectedSet = new Set(fixes.filter((_, i) => checked[i]).map((f) => f.pkg));
    const fixedScores = results.map((r) => {
      const cur = healthOf(r);
      if (!selectedSet.has(r.package.name)) return cur;
      const fix = fixes.find((f) => f.pkg === r.package.name);
      if (!fix) return cur;
      return Math.min(100, cur + fix.points);
    });
    return Math.round(fixedScores.reduce((a, b) => a + b, 0) / fixedScores.length);
  }, [results, fixes, checked, baseScore]);

  const selected = fixes.filter((_, i) => checked[i]);
  const baseGrade = gradeFor(baseScore);
  const projGrade = gradeFor(projected);
  const combined = buildCombined(fixes, checked);
  const delta = projected - baseScore;

  const [copied, setCopied] = useState(false);
  const tRef = useRef<number | null>(null);
  const doCopy = async () => {
    if (!combined) return;
    try { await navigator.clipboard.writeText(combined); } catch {
      const ta = document.createElement("textarea"); ta.value = combined; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); ta.remove();
    }
    setCopied(true); if (tRef.current) window.clearTimeout(tRef.current); tRef.current = window.setTimeout(() => setCopied(false), 1500) as unknown as number;
  };
  useEffect(() => () => { if (tRef.current) window.clearTimeout(tRef.current); }, []);

  const [filter, setFilter] = useState<string | null>(null);
  const [onlyReachable, setOnlyReachable] = useState(false);
  const [onlyLicense, setOnlyLicense] = useState(false);
  const [sort, setSort] = useState<"severity" | "name" | "findings">("severity");
  const toggleFilter = (sev: string) => setFilter((f) => (f === sev ? null : sev));

  void onScanNew;
  const [showScanPanel, setShowScanPanel] = useState(false);
  const handleScanNewClick = () => {
    setShowScanPanel((v) => !v);
  };

  const [simFor, setSimFor] = useState<string | null>(null);
  const [simRes, setSimRes] = useState<any>(null);
  const [simLoading, setSimLoading] = useState(false);
  const handleImpact = async (pkg: string, to: string) => {
    if (simFor === pkg) { setSimFor(null); setSimRes(null); return; }
    setSimFor(pkg); setSimRes(null); setSimLoading(true);
    try {
      const res = await simulateWhatIf({ package_json: packageJson, upgrades: [{ name: pkg, version: to }], ecosystem: "npm", base_scan: scan as any });
      setSimRes(res);
    } catch (e: any) {
      setSimRes({ error: e.message || "Simulate failed" });
    } finally { setSimLoading(false); }
  };

  const maxFindings = Math.max(1, ...results.map((r) => r.vulnerabilities.length));

  const displayRows = useMemo(() => {
    let rows = [...results];
    if (filter) rows = rows.filter((r) => r.vulnerabilities.some((v) => v.severity === filter));
    if (onlyReachable) rows = rows.filter((r: any) => r.reachable === "reachable");
    if (onlyLicense) rows = rows.filter((r: any) => r.license_violation);
    rows.sort((a, b) => {
      if (sort === "name") return a.package.name.localeCompare(b.package.name);
      if (sort === "findings") return b.vulnerabilities.length - a.vulnerabilities.length;
      return (sevRank[b.max_severity] ?? 0) - (sevRank[a.max_severity] ?? 0);
    });
    return rows;
  }, [results, filter, sort, onlyReachable, onlyLicense]);

  const sevCounts = summary.severity_breakdown;
  const seg = [
    { k: "CRITICAL", c: "var(--crit)", n: sevCounts.critical },
    { k: "HIGH", c: "var(--high)", n: sevCounts.high },
    { k: "MEDIUM", c: "var(--warn)", n: sevCounts.medium },
    { k: "LOW", c: "var(--pass)", n: sevCounts.low },
  ];
  const fixByPkg = new Map(fixes.map((f) => [f.pkg, f]));
  const critHigh = (sevCounts.critical || 0) + (sevCounts.high || 0);

  const policy = (scan as any).policy as { pass: boolean; violations: string[] } | undefined;
  const hasPolicyFail = policy && !policy.pass;
  const unmaintainedCount = results.filter((r: any) => r.unmaintained).length;
  const licenseViolations = results.filter((r: any) => (r as any).license_violation).length;
  const staleCount = results.filter((r: any) => !r.unmaintained && typeof r.health_score === "number" && (r.health_score as number) < 75 && (r.health_score as number) >= 50).length;

  return (
    <div className="sr-single">
      {showScanPanel && (
        <div className="sr-card" style={{ marginBottom: 16, padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--muted)", letterSpacing: "0.06em" }}>NEW SCAN · DROP A MANIFEST</div>
            <button onClick={() => setShowScanPanel(false)} className="btn btn-sm">Cancel</button>
          </div>
          <ScanForm
            onResult={(res: any, pkgJson?: string) => {
              if (res) {
                onNewScan?.(res, pkgJson);
                setShowScanPanel(false);
              }
            }}
            onLoading={() => {}}
            onError={() => {}}
            hasResult={false}
          />
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--muted2)", marginTop: 8 }}>Supports package.json, requirements.txt, go.mod, Gemfile, pom.xml and lockfiles · drop file or paste</div>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 8, height: 8, background: "var(--crit)", display: "inline-block", flexShrink: 0 }} aria-hidden />
            <h1 style={{ fontFamily: "var(--font-sans)", fontSize: 22, fontWeight: 700, color: "var(--ink)", margin: 0 }}>Vulnerabilities detected</h1>
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
            package.json · {summary.total_packages} packages · {summary.vulnerable_packages} vulnerable · {summary.total_vulnerabilities} findings · {new Date().toLocaleDateString()}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--muted)", marginRight: 4 }}>Export</span>
          {["SPDX", "CYCLONEDX", "SARIF", "CSV"].map((f) => (
            <button key={f} onClick={() => onExport(f.toLowerCase())} className="btn btn-sm" style={{ fontSize: 11, padding: "4px 8px" }}>{f}</button>
          ))}
          <button
            onClick={handleScanNewClick}
            style={{
              fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600,
              color: "var(--pass)", background: "transparent", border: "1px solid var(--pass)",
              borderRadius: 6, padding: "6px 14px", cursor: "pointer",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--pass)"; (e.currentTarget as HTMLButtonElement).style.color = "#08130D"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = "var(--pass)"; }}
          >
            + Scan new
          </button>
        </div>
      </div>

      <div className="sr-card">
        <div className="sr-stats">
          <div><div className="v" style={{ color: "var(--ink)" }}>{summary.total_packages}</div><div className="k">packages scanned</div></div>
          <div><div className="v" style={{ color: "var(--crit)" }}>{summary.vulnerable_packages}</div><div className="k">vulnerable</div></div>
          <div><div className="v" style={{ color: "var(--crit)" }}>{summary.total_vulnerabilities}</div><div className="k">findings</div></div>
          <div><div className="v" style={{ color: "var(--crit)" }}>{critHigh}</div><div className="k">critical + high</div></div>
        </div>
        <div style={{ padding: "10px 16px", borderTop: "1px solid var(--line)" }}>
          <div className="sr-bar">
            {seg.map((s) => <span key={s.k} style={{ flex: s.n || 0.0001, background: s.c, opacity: s.n ? 1 : 0.12 }} />)}
          </div>
            <div className="sr-legend" style={{ marginTop: 10 }}>
            {[
              { sev: "CRITICAL", label: "Critical", n: sevCounts.critical, c: "var(--crit)" },
              { sev: "HIGH", label: "High", n: sevCounts.high, c: "var(--high)" },
              { sev: "MEDIUM", label: "Medium", n: sevCounts.medium, c: "var(--warn)" },
              { sev: "LOW", label: "Low", n: sevCounts.low, c: "var(--pass)" },
            ].map((x) => (
              <button key={x.sev} onClick={() => toggleFilter(x.sev)} className={`sr-chip ${filter === x.sev ? "active" : ""}`} aria-pressed={filter === x.sev}>
                <span style={{ width: 7, height: 7, background: x.c, display: "inline-block", flexShrink: 0 }} />
                {x.label} <strong>{x.n}</strong>
              </button>
            ))}
            <button onClick={() => setOnlyReachable((v) => !v)} className={`sr-chip ${onlyReachable ? "active" : ""}`} aria-pressed={onlyReachable}><span style={{ width: 7, height: 7, background: "var(--ink)", display: "inline-block" }} /> Reachable <strong>{results.filter((r: any) => r.reachable === "reachable").length}</strong></button>
            <button onClick={() => setOnlyLicense((v) => !v)} className={`sr-chip ${onlyLicense ? "active" : ""}`} aria-pressed={onlyLicense}><span style={{ width: 7, height: 7, background: "var(--warn)", display: "inline-block" }} /> License <strong>{licenseViolations}</strong></button>
          </div>
        </div>

        <div style={{ borderTop: "1px solid var(--line)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", gap: 12 }}>
            <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>
              {filter ? `${displayRows.length} packages contain ${filter} · ${sevCounts[filter.toLowerCase() as keyof typeof sevCounts]} findings` : `${summary.vulnerable_packages} packages with vulnerabilities`}
              {filter && <span style={{ color: "var(--muted)", fontWeight: 400 }}> · filtered by {filter.toLowerCase()} (was {summary.vulnerable_packages})</span>}
            </div>
            <select value={sort} onChange={(e) => setSort(e.target.value as any)} style={{ fontFamily: "var(--font-mono)", fontSize: 12, background: "var(--bg)", color: "var(--ink)", border: "1px solid var(--line)", borderRadius: 6, padding: "4px 8px" }}>
              <option value="severity">Sort by severity</option>
              <option value="name">Sort by name</option>
              <option value="findings">Sort by findings</option>
            </select>
          </div>

          <div className="sr-table-wrap">
            <table className="sr-table">
              <thead>
                <tr>
                  <th>Package</th>
                  <th>Severity</th>
                  <th>Findings</th>
                  <th>Apply fix</th>
                  <th>Score</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {displayRows.map((r) => {
                  const sev = r.max_severity;
                  const clr = sev === "CRITICAL" ? "var(--crit)" : sev === "HIGH" ? "var(--high)" : sev === "MEDIUM" ? "var(--warn)" : sev === "LOW" ? "var(--pass)" : "var(--muted2)";
                  const border = sev === "CRITICAL" ? "rgba(255,92,92,.45)" : sev === "HIGH" ? "rgba(255,138,92,.45)" : sev === "MEDIUM" ? "rgba(245,196,83,.45)" : sev === "LOW" ? "rgba(57,217,138,.45)" : "var(--line)";
                  const barW = r.vulnerabilities.length ? (r.vulnerabilities.length / maxFindings) * 48 + 4 : 0;
                  const barClr = sev === "NONE" ? "var(--line)" : clr;
                  const fix = fixByPkg.get(r.package.name);
                  const isTransitive = fix ? !!(fix as any).is_transitive : false;
                  const knownFixed = fix ? (fix.to !== "unknown" && !String(fix.to).includes("latest") && !String(fix.to).includes("x")) : false;
                  // overall health gain for this package alone (truthful): points spread across avg
                  const overallGain = fix ? Math.round(fix.points / Math.max(1, results.length)) : 0;
                  let conf: "HIGH" | "MEDIUM" | "LOW" = "MEDIUM";
                  let confColor = "var(--warn)";
                  if (fix?.risk === "major") { conf = "LOW"; confColor = "var(--crit)"; }
                  else if (isTransitive) { conf = "MEDIUM"; confColor = "var(--warn)"; }
                  else if (fix?.risk === "patch" && knownFixed) { conf = "HIGH"; confColor = "var(--pass)"; }
                  const isOpen = simFor === r.package.name;
                  return (
                    <>
                      <tr key={r.package.name} style={{ cursor: onSelectResult ? "pointer" : "default" }} onClick={() => onSelectResult?.(r)}>
                        <td>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
                            <span style={{ width: 7, height: 7, background: clr, display: "inline-block", flexShrink: 0 }} />
                            <span style={{ color: "var(--ink)" }}>{r.package.name}</span>
                            <span style={{ color: "var(--muted)" }}>{r.package.version}</span>
                          </span>
                        </td>
                        <td>
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, color: sev === "NONE" ? "var(--muted)" : clr, border: `1px solid ${border}`, borderRadius: 4, padding: "1px 6px" }}>
                            {sev === "NONE" ? "NONE" : sev}
                          </span>
                        </td>
                        <td>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                            <span style={{ width: 48, height: 4, background: "var(--line)", borderRadius: 2, display: "inline-block", position: "relative", overflow: "hidden" }}>
                              <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: barW, background: barClr }} />
                            </span>
                            <span style={{ color: "var(--muted)", fontSize: 12 }}>{r.vulnerabilities.length}</span>
                          </span>
                        </td>
                        <td>
                          {fix ? (
                            <label style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" }} onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={!!checked[fixes.findIndex((f) => f.pkg === r.package.name)]}
                                onChange={() => {
                                  const idx = fixes.findIndex((f) => f.pkg === r.package.name);
                                  if (idx >= 0) setChecked((p) => { const n = [...p]; n[idx] = !n[idx]; return n; });
                                }}
                                style={{ accentColor: "var(--pass)", width: 14, height: 14 }}
                              />
                              <span style={{ color: "var(--pass)", fontSize: 12 }}>→ {fix.to}</span>
                              <span style={{ fontSize: 11, color: fix.risk === "major" ? "var(--warn)" : "var(--muted)" }}>{fix.risk}</span>
                            </label>
                          ) : (
                            <span style={{ color: "var(--muted2)", fontSize: 12 }}>no fix needed</span>
                          )}
                        </td>
                        <td style={{ color: "var(--pass)", fontSize: 12, textAlign: "right" }}>{fix ? `+${overallGain}` : ""}</td>
                        <td style={{ textAlign: "right" }}>
                          {fix && (
                            <button
                              aria-expanded={isOpen}
                              onClick={(e) => { e.stopPropagation(); handleImpact(r.package.name, fix.to); }}
                              style={{
                                fontFamily: "var(--font-mono)", fontSize: 11, padding: "3px 8px", borderRadius: 4,
                                border: `1px solid ${isOpen ? "var(--pass)" : "var(--line)"}`,
                                background: isOpen ? "rgba(57,217,138,0.1)" : "transparent",
                                color: isOpen ? "var(--pass)" : "var(--muted)", cursor: "pointer",
                              }}
                            >
                              Impact
                            </button>
                          )}
                        </td>
                      </tr>
                      {isOpen && (
                        <tr>
                          <td colSpan={6} style={{ padding: 0, borderBottom: "1px solid var(--line)", background: "var(--bg)" }}>
                            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.9fr 0.7fr", gap: 16, padding: "12px 16px", fontFamily: "var(--font-mono)", fontSize: 11 }}>
                              {simLoading && <span style={{ color: "var(--muted)" }}>Simulating…</span>}
                              {!simLoading && simRes && !simRes.error && (
                                <>
                                  <div>
                                    <div style={{ color: "var(--muted)", letterSpacing: "0.06em", fontSize: 10 }}>WHAT CHANGES</div>
                                    <div style={{ color: "var(--ink)", marginTop: 4 }}>
                                      {r.package.name} {fix?.from} → {fix?.to} {isTransitive ? "via transitive override" : "direct patch"} fixes {simRes.base?.vulnerabilities - simRes.proposed?.vulnerabilities} findings
                                    </div>
                                  </div>
                                  <div>
                                    <div style={{ color: "var(--muted)", letterSpacing: "0.06em", fontSize: 10 }}>CONFIDENCE</div>
                                    <div style={{ display: "flex", gap: 3, marginTop: 6, alignItems: "center" }}>
                                      {[0, 1, 2].map((i) => (
                                        <span key={i} style={{ width: 14, height: 6, borderRadius: 2, background: (conf === "HIGH" ? 3 : conf === "MEDIUM" ? 2 : 1) > i ? confColor : "var(--line)", display: "inline-block" }} />
                                      ))}
                                      <span style={{ color: confColor, marginLeft: 6, fontSize: 11 }}>{conf}</span>
                                    </div>
                                    <div style={{ color: "var(--muted2)", fontSize: 10, marginTop: 2 }}>{conf === "HIGH" ? "direct patch fixed" : conf === "MEDIUM" ? "transitive override" : "major peer untested"}</div>
                                  </div>
                                  <div style={{ textAlign: "right" }}>
                                    <div style={{ color: "var(--muted)", letterSpacing: "0.06em", fontSize: 10 }}>SCORE</div>
                                    <div style={{ color: "var(--pass)", marginTop: 4, fontSize: 12 }}>+{fix ? fix.points : 0} health points</div>
                                    <div style={{ color: "var(--muted2)", fontSize: 10 }}>{simRes.base?.health} → {simRes.proposed?.health}</div>
                                  </div>
                                </>
                              )}
                              {!simLoading && simRes?.error && <span style={{ color: "var(--crit)" }}>{simRes.error}</span>}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* sticky action bar */}
      <div className="sr-sticky">
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 28, fontWeight: 600, color: "var(--ink)", lineHeight: 1 }}>{projected}</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--muted)" }}>{projGrade}</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--pass)" }}>{delta > 0 ? `+${delta}` : delta} from {selected.length} fixes</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--muted2)" }}>now {baseScore} · {baseGrade}</span>
          <div style={{ position: "relative", height: 4, background: "var(--line)", borderRadius: 2, overflow: "hidden", width: 120, flexShrink: 0 }}>
            <div style={{ position: "absolute", top: 0, bottom: 0, left: Math.min(baseScore, projected) + "%", width: Math.abs(delta) + "%", background: "var(--pass)", transition: reduced ? "none" : "left 0.35s ease, width 0.35s ease" }} />
            <div style={{ position: "absolute", top: -2, bottom: -2, left: `calc(${baseScore}% - 1px)`, width: 2, background: "var(--muted)" }} />
            <div style={{ position: "absolute", top: -2, bottom: -2, left: `calc(${projected}% - 1px)`, width: 2, background: "var(--ink)" }} />
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 260, flex: 1, justifyContent: "flex-end" }}>
          <span style={{ color: "var(--pass)", fontFamily: "var(--font-mono)", fontSize: 12 }}>$</span>
          <code style={{ flex: 1, fontFamily: "var(--font-mono)", fontSize: 11, color: combined ? "var(--ink)" : "var(--muted2)", whiteSpace: "nowrap", overflowX: "auto" }}>{combined || "Select fixes to generate command"}</code>
          <button onClick={doCopy} disabled={!combined} style={{ fontFamily: "var(--font-mono)", fontSize: 11, padding: "4px 10px", borderRadius: 4, border: "1px solid var(--line)", background: combined ? "var(--bg2)" : "transparent", color: combined ? "var(--ink)" : "var(--muted2)", cursor: combined ? "pointer" : "not-allowed", opacity: combined ? 1 : 0.6 }}>{copied ? "Copied" : "Copy"}</button>
        </div>
      </div>
    </div>
  );
}
