const features = [
  {
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="var(--ink)" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" fill="currentColor"/>
      </svg>
    ),
    title: "Vulnerability Scanning",
    desc: "Detects known vulnerabilities across npm, pip, Go, Maven, NuGet, RubyGems, and Cargo ecosystems via the OSV.dev API.",
    group: "Core",
  },
  {
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="var(--ink)" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" fill="currentColor"/>
      </svg>
    ),
    title: "License Scanning",
    desc: "Identifies package licenses (MIT, GPL, Apache, etc.) and flags unmaintained packages with no updates in 2+ years.",
    group: "Core",
  },
  {
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="var(--ink)" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" fill="currentColor"/>
      </svg>
    ),
    title: "Fix Suggestions",
    desc: "Recommends safe version upgrades with risk classification (safe / minor / major) — helps you decide when to update.",
    group: "Core",
  },
  {
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="var(--ink)" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" fill="currentColor"/>
      </svg>
    ),
    title: "Upgrade Safety Score",
    desc: "Each fix is classified as safe (patch), minor risk (minor version bump), or major risk (major version bump) based on semver analysis.",
    group: "Core",
  },
  {
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="var(--ink)" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" fill="currentColor"/>
      </svg>
    ),
    title: "Dependency Tree",
    desc: "Visualizes your dependency graph from lock files (npm, yarn, pnpm) to help understand transitive dependencies.",
    group: "Core",
  },
  {
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="var(--ink)" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" fill="currentColor"/>
      </svg>
    ),
    title: "Unmaintained Detection",
    desc: "Flags packages with no updates in 2+ years, helping you identify abandoned dependencies before they become security risks.",
    group: "Growth",
  },
  {
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="var(--ink)" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" fill="currentColor"/>
      </svg>
    ),
    title: "Health Score",
    desc: "Calculates a 0–100 health score per package with letter grade (A–F) based on vulnerabilities, license risk, and maintenance status.",
    group: "Growth",
  },
  {
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="var(--ink)" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" fill="currentColor"/>
      </svg>
    ),
    title: "SBOM Export",
    desc: "Generates Software Bill of Materials in SPDX 2.3 and CycloneDX 1.5 formats — compliant with industry standards.",
    group: "Growth",
  },
  {
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="var(--ink)" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" fill="currentColor"/>
      </svg>
    ),
    title: "SARIF / CSV Export",
    desc: "Exports scan results to SARIF (for GitHub code scanning) or CSV (for spreadsheets and reporting).",
    group: "Growth",
  },
  {
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="var(--ink)" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" fill="currentColor"/>
      </svg>
    ),
    title: "Monorepo Support",
    desc: "Auto-detects workspace structures for pnpm workspaces, Lerna, Nx, and Turbo — scans all sub-projects in one run.",
    group: "Growth",
  },
  {
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="var(--ink)" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" fill="currentColor"/>
      </svg>
    ),
    title: "Scan History",
    desc: "Persistent SQLite-backed scan history with per-run severity breakdowns. Review past scans at any time without re-scanning.",
    group: "Ecosystem",
  },
  {
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="var(--ink)" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" fill="currentColor"/>
      </svg>
    ),
    title: "Security News Feed",
    desc: "Live security advisory feed from the GitHub Advisory Database with keyword search and severity filtering.",
    group: "Ecosystem",
  },
  {
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="var(--ink)" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" fill="currentColor"/>
      </svg>
    ),
    title: "PR Comments",
    desc: "Posts scan results as markdown comments on GitHub pull requests — keeps vulnerability info where developers already work.",
    group: "Ecosystem",
  },
  {
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="var(--ink)" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" fill="currentColor"/>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" fill="currentColor"/>
      </svg>
    ),
    title: "CI/CD Integration",
    desc: "Reusable GitHub workflow for continuous vulnerability scanning on push, pull request, and schedule. Uploads SARIF for code scanning alerts.",
    group: "Ecosystem",
  },
  {
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="var(--ink)" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" fill="currentColor"/>
      </svg>
    ),
    title: "Ignore Rules",
    desc: "Configure package-level ignore rules and expiry dates in .cipherrc — skip known false positives until a specified date.",
    group: "Core",
  },
];

const groups = ["Core", "Growth", "Ecosystem"];

export function Features() {
  return (
    <div style={{display:"flex", flexDirection:"column", gap:"32px"}}>
      {groups.map((group) => (
        <div key={group}>
          <div style={{display:"flex", alignItems:"center", gap:"12px", marginBottom:"16px"}}>
            <span style={{fontFamily:"var(--font-mono)", fontSize:"12px", color:"var(--pass)", letterSpacing:"0.06em", textTransform:"uppercase", fontWeight:600}}>{group}</span>
            <div style={{flex:"1", height:"1px", background:"var(--line)"}} />
            <span style={{fontFamily:"var(--font-mono)", fontSize:"10px", color:"var(--muted2)"}}>{features.filter((f) => f.group === group).length} features</span>
          </div>
          <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(240px, 1fr))", gap:"12px"}}>
            {features.filter((f) => f.group === group).map((feature) => (
              <div key={feature.title} style={{border:"1px solid var(--line)", borderRadius:"8px", padding:"16px", background:"var(--bg2)", display:"flex", flexDirection:"column", gap:"8px"}}>
                <div style={{width:"32px", height:"32px", borderRadius:"6px", border:"1px solid var(--line)", display:"flex", alignItems:"center", justifyContent:"center", color:"var(--muted)"}}>
                  {feature.icon}
                </div>
                <h3 style={{fontFamily:"var(--font-sans)", fontSize:"13px", fontWeight:600, color:"var(--ink)"}}>{feature.title}</h3>
                <p style={{fontFamily:"var(--font-sans)", fontSize:"12px", color:"var(--muted)", lineHeight:1.6}}>{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
