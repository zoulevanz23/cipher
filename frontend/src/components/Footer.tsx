/* Footer: verdict-first structure — runnable commands live in the
   RUN IT column (technical credibility, never cut). Columns:
   RUN IT / Product / Resources / Sources. Grayscale only. */

import type { CSSProperties } from "react";

interface Props {
  onFeatures?: () => void;
  onHistory?: () => void;
  onNews?: () => void;
  onAbout?: () => void;
  onScanTool?: () => void;
  onAnchor?: (id: string) => void;
}

function ColLabel({ children }: { children: string }) {
  return (
    <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--muted)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "12px" }}>{children}</div>
  );
}

function Link({ onClick, children }: { onClick?: () => void; children: string }) {
  return (
    <button onClick={onClick} style={{ display: "block", background: "transparent", border: "none", padding: 0, fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--muted)", cursor: "pointer", textAlign: "left", marginBottom: "8px" }}
      onMouseEnter={(e) => { e.currentTarget.style.color = "var(--ink)"; }} onMouseLeave={(e) => { e.currentTarget.style.color = "var(--muted)"; }}>
      {children}
    </button>
  );
}

export function Footer({ onFeatures, onHistory, onNews, onAbout, onScanTool, onAnchor }: Props) {
  // Developer profile links.
  const GITHUB_URL = "https://github.com/zoulevanz23";
  const LINKEDIN_URL = "https://www.linkedin.com/in/josh-ivan-sartin-312287376/";
  const PORTFOLIO_URL = "#";

  const iconLink: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    color: "var(--muted)",
    textDecoration: "none",
  };
  return (
    <footer style={{ borderTop: "1px solid var(--line)", padding: "32px 0", marginTop: "48px" }}>
      <div className="page-shell">
        <div style={{ display: "flex", gap: "24px", flexWrap: "wrap", marginBottom: "24px" }}>
          <div style={{ flex: "1.4", minWidth: "240px" }}>
            <ColLabel>RUN IT</ColLabel>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--muted)", background: "var(--bg2)", border: "1px solid var(--line)", borderRadius: "4px", padding: "8px 12px", marginBottom: "6px", overflowX: "auto", whiteSpace: "nowrap" }}>
              <span style={{ color: "var(--pass)" }}>$</span> pip install cipher
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--muted)", background: "var(--bg2)", border: "1px solid var(--line)", borderRadius: "4px", padding: "8px 12px", marginBottom: "6px", overflowX: "auto", whiteSpace: "nowrap" }}>
              <span style={{ color: "var(--pass)" }}>$</span> cipher --path . --format sarif --fail-on high
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--muted)", background: "var(--bg2)", border: "1px solid var(--line)", borderRadius: "4px", padding: "8px 12px", overflowX: "auto", whiteSpace: "nowrap" }}>
              <span style={{ color: "var(--pass)" }}>$</span> cipher --path . --format json &gt; results.json
            </div>
          </div>
          <div style={{ flex: 1, minWidth: "140px" }}>
            <ColLabel>PRODUCT</ColLabel>
            <Link onClick={onFeatures}>Features</Link>
            <Link onClick={onHistory}>Scan history</Link>
            <Link onClick={onNews}>Security news</Link>
            <Link onClick={() => onAnchor?.("tiers")}>Tiers</Link>
          </div>
          <div style={{ flex: 1, minWidth: "140px" }}>
            <ColLabel>RESOURCES</ColLabel>
            <Link onClick={onScanTool}>Live scan tool</Link>
            <Link onClick={() => onAnchor?.("cli")}>CLI reference</Link>
            <Link onClick={() => onAnchor?.("pipeline")}>How scans resolve</Link>
            <Link onClick={onAbout}>About</Link>
          </div>
          <div style={{ flex: 1, minWidth: "140px" }}>
            <ColLabel>SOURCES</ColLabel>
            <a href="https://osv.dev" target="_blank" rel="noopener noreferrer" style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--muted)", textDecoration: "none", marginBottom: "8px" }}>OSV.dev</a>
            <a href="https://nvd.nist.gov" target="_blank" rel="noopener noreferrer" style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--muted)", textDecoration: "none", marginBottom: "8px" }}>NVD</a>
            <a href="https://github.com/advisories" target="_blank" rel="noopener noreferrer" style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--muted)", textDecoration: "none", marginBottom: "8px" }}>GitHub Advisory Database</a>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px", borderTop: "1px solid var(--line)", paddingTop: "16px" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--muted2)" }}>Cipher VulnChecker · MIT License · 2026</span>
          <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--muted2)" }}>npm · pip · Go · Maven · NuGet · RubyGems · Cargo</span>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" aria-label="GitHub" title="GitHub" style={iconLink}
                onMouseEnter={(e) => { e.currentTarget.style.color = "var(--ink)"; }} onMouseLeave={(e) => { e.currentTarget.style.color = "var(--muted)"; }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" /></svg>
              </a>
              <a href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" title="LinkedIn" style={iconLink}
                onMouseEnter={(e) => { e.currentTarget.style.color = "var(--ink)"; }} onMouseLeave={(e) => { e.currentTarget.style.color = "var(--muted)"; }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z" /></svg>
              </a>
              <a href={PORTFOLIO_URL} target="_blank" rel="noopener noreferrer" aria-label="Developer portfolio" title="Developer portfolio" style={iconLink}
                onMouseEnter={(e) => { e.currentTarget.style.color = "var(--ink)"; }} onMouseLeave={(e) => { e.currentTarget.style.color = "var(--muted)"; }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" /></svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
