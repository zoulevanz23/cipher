import { useInView } from "./hooks";

/* Live advisory ticker: thin infinite strip referencing the real
   Security News Feed (GitHub Advisory data). Right-to-left loop,
   severity words colored inline. Pauses on hover (CSS) and
   off-viewport (observer class). Placeholder entries. */

const ENTRIES: Array<{ id: string; pkg: string; sev: "CRITICAL" | "HIGH" | "MEDIUM"; what: string; fix: string }> = [
  { id: "GHSA-xxxx-xxxx-xxxx", pkg: "lodash", sev: "HIGH", what: "prototype pollution", fix: "patched 4.17.21" },
  { id: "GHSA-xxxx-xxxx-xxxx", pkg: "axios", sev: "HIGH", what: "credential leakage via redirect", fix: "patched 1.6.0" },
  { id: "GHSA-xxxx-xxxx-xxxx", pkg: "requests", sev: "MEDIUM", what: ".netrc credential leak", fix: "patched 2.32.0" },
  { id: "GHSA-xxxx-xxxx-xxxx", pkg: "minimist", sev: "CRITICAL", what: "prototype pollution", fix: "patched 1.2.8" },
  { id: "GHSA-xxxx-xxxx-xxxx", pkg: "jsonwebtoken", sev: "HIGH", what: "JWT verification bypass", fix: "patched 9.0.0" },
  { id: "GHSA-xxxx-xxxx-xxxx", pkg: "debug", sev: "MEDIUM", what: "ReDoS in %o formatter", fix: "patched 4.3.1" },
  { id: "GHSA-xxxx-xxxx-xxxx", pkg: "semver", sev: "MEDIUM", what: "ReDoS in version range", fix: "patched 7.5.2" },
  { id: "GHSA-xxxx-xxxx-xxxx", pkg: "qs", sev: "HIGH", what: "prototype poisoning", fix: "patched 6.11.0" },
  { id: "GHSA-xxxx-xxxx-xxxx", pkg: "urllib3", sev: "MEDIUM", what: "request body leak on redirect", fix: "patched 2.0.7" },
  { id: "GHSA-xxxx-xxxx-xxxx", pkg: "express", sev: "HIGH", what: "open redirect in serve-static", fix: "patched 4.19.2" },
];

const SEV: Record<string, string> = { CRITICAL: "var(--crit)", HIGH: "var(--high)", MEDIUM: "var(--warn)" };

function Row() {
  return (
    <>
      {ENTRIES.map((e, i) => (
        <span key={i} style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--muted)", whiteSpace: "nowrap" }}>
          {e.id} <span style={{ color: "var(--ink)" }}>· {e.pkg}</span> · <span style={{ color: SEV[e.sev], fontWeight: 600 }}>{e.sev}</span> · {e.what} · <span style={{ color: "var(--pass)" }}>{e.fix}</span>
          <span style={{ color: "var(--muted2)", marginLeft: "48px" }}>///</span>
        </span>
      ))}
    </>
  );
}

export function ThreatTicker() {
  const { ref, inView } = useInView<HTMLDivElement>(0.05);
  return (
    <div ref={ref} className="lp-breakout" style={{ background: "var(--bg2)", borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)", opacity: inView ? 1 : 0, transition: "opacity 200ms ease-out" }}>
      <div className={`ticker${inView ? "" : " ticker-paused"}`} style={{ paddingTop: "10px", paddingBottom: "10px" }}>
        <div className="ticker-track">
          <Row />
          <Row />
        </div>
      </div>
    </div>
  );
}
