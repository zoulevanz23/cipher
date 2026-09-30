import { useInView, useStepSequence } from "./hooks";
import { useEffect, useState } from "react";

/* Feature sections mirror the product's own 3 groups exactly
   (01/CORE 02/GROWTH 03/ECOSYSTEM). Each group's label ("01 / CORE")
   appears first, instantly, then a hairline divider draws left-to-right
   beneath it (150-200ms), THEN the cards within that group snap into
   visibility in a tight grid-reading-order stagger (~60ms between cards).
   Cards: opacity 0→1 only, no transform/scale. Three groups animate with
   slightly different timing — Core fastest/densest (6 items), Ecosystem
   more deliberate (4 items). No shadows, ever. */

function Icon({ d }: { d: React.ReactNode }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      {d}
    </svg>
  );
}

const GROUPS: Array<{
  n: string; label: string; items: Array<{ t: string; d: string; icon: React.ReactNode }>;
}> = [
  {
    n: "01", label: "CORE", items: [
      { t: "Vulnerability Scanning", d: "Known-vulnerability detection across npm, pip, Go, Maven, NuGet, RubyGems, and Cargo via OSV.dev.", icon: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /><path d="M12 4v3M12 17v3M4 12h3M17 12h3" /></> },
      { t: "License Scanning", d: "Identifies package licenses and flags copyleft or unknown-license risk before you ship.", icon: <><rect x="5" y="4" width="14" height="16" rx="1" /><path d="M9 9h6M9 13h6" /></> },
      { t: "Fix Suggestions", d: "Recommends the minimal safe upgrade per finding, with the exact install command ready to copy.", icon: <><path d="M4 17l6-6M13 4l7 7-6 6-7-7z" /><path d="M4 21h7" /></> },
      { t: "Upgrade Safety Score", d: "Each fix is labeled safe, minor, or major risk from semver distance — patch with confidence.", icon: <><path d="M3 20h18" /><path d="M6 20v-6M12 20V8M18 20v-10" /></> },
      { t: "Dependency Tree", d: "Resolves the full graph from lockfiles so transitive vulnerabilities surface with their path.", icon: <><circle cx="12" cy="5" r="2" /><circle cx="6" cy="15" r="2" /><circle cx="18" cy="15" r="2" /><path d="M12 7v4M12 11l-6 4M12 11l6 4" /></> },
      { t: "Ignore Rules", d: "Suppress a finding until a chosen version or date via .cipherrc — documented, expiring ignores.", icon: <><circle cx="12" cy="12" r="8" /><path d="M6 6l12 12" /></> },
    ],
  },
  {
    n: "02", label: "GROWTH", items: [
      { t: "Health Score", d: "0–100 score plus A–F grade per package from vulnerabilities, license risk, and maintenance.", icon: <><path d="M3 17l5-6 4 3 6-8" /><path d="M3 21h18" /></> },
      { t: "Unmaintained Detection", d: "Flags packages with no release in 2+ years before abandonment becomes your incident.", icon: <><circle cx="12" cy="12" r="8" /><path d="M12 8v4l3 2" /></> },
      { t: "SBOM Export", d: "Software bills of materials in SPDX 2.3 and CycloneDX 1.5 for compliance and procurement.", icon: <><path d="M6 3h9l4 4v14H6z" /><path d="M15 3v4h4M9 12h6M9 16h6" /></> },
      { t: "SARIF / CSV Export", d: "SARIF uploads straight into GitHub code scanning; CSV drops into any spreadsheet.", icon: <><path d="M12 3v12M7 10l5 5 5-5" /><path d="M4 19h16" /></> },
      { t: "Monorepo Support", d: "Detects pnpm workspaces, Lerna, Nx, and Turborepo layouts and scans every workspace.", icon: <><rect x="3" y="3" width="8" height="8" /><rect x="13" y="3" width="8" height="8" /><rect x="3" y="13" width="8" height="8" /><rect x="13" y="13" width="8" height="8" /></> },
    ],
  },
  {
    n: "03", label: "ECOSYSTEM", items: [
      { t: "Scan History", d: "SQLite-backed history with trend charts, vulnerability aging, and fix velocity per project.", icon: <><path d="M3 12h4l3-7 4 14 3-7h4" /></> },
      { t: "Security News Feed", d: "Live GitHub Advisory stream with keyword search and severity filtering.", icon: <><path d="M4 6h16M4 12h16M4 18h10" /><circle cx="19" cy="18" r="2" /></> },
      { t: "PR Comments", d: "Posts scan verdicts as GitHub PR markdown so findings meet developers in review.", icon: <><path d="M4 5h16v10H9l-5 4z" /><path d="M8 9h8M8 12h5" /></> },
      { t: "CI/CD Integration", d: "Reusable GitHub workflow with --fail-on severity gates and SARIF upload.", icon: <><circle cx="6" cy="6" r="2" /><circle cx="6" cy="18" r="2" /><circle cx="18" cy="12" r="2" /><path d="M6 8v8M8 12h8" /></> },
    ],
  },
];

const dividerStart = [0, 120, 240]; // per-group divider draw start delay (ms)
const cardStagger = [40, 60, 80]; // per-group card fade stagger (ms), faster for Core

export function FeatureGroups() {
  const { ref, inView } = useInView<HTMLDivElement>(0.3);
  const [phase, setPhase] = useState(-1);
  // Advance phase per group: Core at t=0, Growth at t=1, Ecosystem at t=2 (200ms gap)
  const step = useStepSequence(inView, 3, (i) => i * 200 - 100);
  useEffect(() => {
    if (step > phase) setPhase(step);
  }, [step]);

  return (
    <section ref={ref} id="features">
      <div style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--muted)", letterSpacing: "0.06em", marginBottom: "8px" }}>CAPABILITIES</div>
      <h2 style={{ fontFamily: "var(--font-sans)", fontSize: "24px", fontWeight: 700, color: "var(--ink)", margin: "0 0 20px" }}>Everything a scan carries.</h2>
      {GROUPS.map((g, gi) => {
        const gphase = phase >= gi ? 1 : 0; // 0=inactive, 1=active
        const dTransition = "width " + String(dividerStart[gi] + 200) + "ms ease-out";
        const cTransition = String(cardStagger[gi]) + "ms ease-out";
        return (
          <div key={g.n} style={{ marginBottom: "32px" }}>
            {/* Label: instantly visible when group activates */}
            <div style={{ display: "flex", alignItems: "baseline", gap: "12px", borderTop: gphase ? "1px solid var(--line)" : "none", paddingTop: gphase ? "12px" : 0, marginBottom: gphase ? "12px" : 0 }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--pass)" }}>{g.n}</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--muted)", letterSpacing: "0.06em" }}>/ {g.label}</span>
            </div>
            {/* Divider: draws left-to-right when group activates (150-200ms) */}
            <div style={{ height: 2, background: gphase ? "var(--line)" : "transparent", width: gphase ? "100%" : 0, transition: dTransition, marginBottom: "12px" }} />
            {/* Cards: opacity snap with per-group stagger */}
            <div className="lp-grid-3" style={{ transition: cTransition }}>
              {g.items.map((f) => (
                <div key={f.t} style={{ background: "var(--bg2)", border: "1px solid var(--line)", borderRadius: "4px", padding: "16px", opacity: gphase ? 1 : 0 }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(57,217,138,.4)"; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--line)"; }}>
                  <Icon d={f.icon} />
                  <div style={{ fontFamily: "var(--font-sans)", fontSize: "14px", fontWeight: 600, color: "var(--ink)", marginTop: "10px" }}>{f.t}</div>
                  <div style={{ fontFamily: "var(--font-sans)", fontSize: "13px", color: "var(--muted)", lineHeight: 1.6, marginTop: "6px" }}>{f.d}</div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}