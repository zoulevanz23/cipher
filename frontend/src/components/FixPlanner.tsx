import { useState, useMemo, useRef, useEffect } from "react";

export type FixRisk = "patch" | "minor" | "major";
export type FixSeverity = "critical" | "high" | "medium" | "low";

export interface Fix {
  pkg: string;
  from: string;
  to: string;
  severity: FixSeverity;
  cvss: number;
  risk: FixRisk;
  points: number;
  command: string;
}

function gradeFor(score: number): string {
  // Truthful: matches vulnchecker/health.py health_grade
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 50) return "C";
  if (score >= 25) return "D";
  return "F";
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return;
    setReduced(mq.matches);
    const fn = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);
  return reduced;
}

function inferPrefix(commands: string[]): string {
  if (commands.length === 0) return "npm install";
  const first = commands[0].trim();
  if (first.startsWith("pip install")) return "pip install";
  if (first.startsWith("go get")) return "go get";
  if (first.startsWith("bundle")) return "bundle update";
  if (first.startsWith("mvn") || first.includes("mvn")) return "mvn install";
  // npm variants
  if (first.startsWith("npm install") || first.startsWith("npm i ")) return "npm install";
  if (first.startsWith("yarn add")) return "yarn add";
  if (first.startsWith("pnpm add")) return "pnpm add";
  // fallback to npm install
  return "npm install";
}

function buildCombinedCommand(fixes: Fix[], checked: boolean[]): string {
  const selected = fixes.filter((_, i) => checked[i]);
  if (selected.length === 0) return "";
  const prefix = inferPrefix(selected.map((f) => f.command));
  // For go, pkg@version vs pkg==version etc — use to as-is with @
  // For pip, use == ; for others use @
  const isPip = prefix.startsWith("pip");
  const isGo = prefix.startsWith("go get");
  const parts = selected.map((f) => {
    const cleanTo = f.to.trim();
    // if to already contains package prefix, avoid duplication — but most are like "4.17.21" or "latest" or "5.x"
    // normalize: pkg + separator + to
    if (isPip) return `${f.pkg}==${cleanTo}`;
    if (isGo) return `${f.pkg}@${cleanTo}`;
    return `${f.pkg}@${cleanTo}`;
  });
  return `${prefix} ${parts.join(" ")}`;
}

export function FixPlanner({ baseScore, fixes }: { baseScore: number; fixes: Fix[] }) {
  const reduced = usePrefersReducedMotion();
  const [checked, setChecked] = useState<boolean[]>(() =>
    fixes.map((f) => f.risk !== "major")
  );
  // sync when fixes change (new scan)
  useEffect(() => {
    setChecked(fixes.map((f) => f.risk !== "major"));
  }, [fixes]);

  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<number | null>(null);

  const selectedFixes = useMemo(() => fixes.filter((_, i) => checked[i]), [fixes, checked]);
  const selectedPoints = useMemo(() => selectedFixes.reduce((s, f) => s + f.points, 0), [selectedFixes]);
  const projected = useMemo(() => Math.min(100, baseScore + selectedPoints), [baseScore, selectedPoints]);
  const delta = projected - baseScore;
  const baseGrade = gradeFor(baseScore);
  const projectedGrade = gradeFor(projected);
  const combinedCommand = useMemo(() => buildCombinedCommand(fixes, checked), [fixes, checked]);
  const remaining = fixes.length - selectedFixes.length;

  const hasSelection = selectedFixes.length > 0;

  const toggle = (idx: number) => {
    setChecked((prev) => {
      const next = [...prev];
      next[idx] = !next[idx];
      return next;
    });
  };

  const handleCopy = async () => {
    if (!combinedCommand) return;
    try {
      await navigator.clipboard.writeText(combinedCommand);
    } catch {
      // fallback
      const ta = document.createElement("textarea");
      ta.value = combinedCommand;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    if (copyTimer.current) window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setCopied(false), 1500);
  };

  useEffect(() => {
    return () => {
      if (copyTimer.current) window.clearTimeout(copyTimer.current);
    };
  }, []);

  // scale calculations: track 0-100
  const leftPct = (v: number) => Math.max(0, Math.min(100, v));

  return (
    <div
      style={{
        background: "var(--bg2)",
        border: "1px solid var(--line)",
        borderRadius: "6px",
        maxWidth: "600px",
        width: "100%",
        overflow: "hidden",
      }}
    >
      {/* Header — health demoted to optional secondary, per dimensional verdict */}
      <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid var(--line)" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
          <span
            aria-live="polite"
            aria-atomic="true"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "22px",
              fontWeight: 500,
              letterSpacing: "-0.02em",
              lineHeight: 1,
              color: "var(--muted)",
            }}
          >
            {projected}
          </span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--muted2)" }}>
            {projectedGrade} <span style={{ opacity: 0.6 }}>derived</span>
          </span>
          <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--muted2)" }}>
            now {baseScore} {baseGrade}
          </span>
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--muted2)", marginTop: "4px" }}>
          Derived health — secondary summary only. Primary verdict is Security / Maintenance / License / Policy above.
          {selectedFixes.length > 0 && delta !== 0 && <span style={{ color: "var(--muted)" }}> · {delta > 0 ? `+${delta}` : delta} if applied</span>}
        </div>

        {/* Score scale */}
        <div style={{ marginTop: "14px" }}>
          <div style={{ position: "relative", height: "8px", background: "var(--line)", borderRadius: "2px", overflow: "hidden" }}>
            {/* grade ticks: at 60/70/80/90 — we render as vertical dividers inside track */}
            <div style={{ position: "absolute", inset: 0, display: "flex" }}>
              <div style={{ flex: 60 }} />
              <div style={{ width: "1px", background: "var(--bg2)", opacity: 0.9 }} />
              <div style={{ flex: 10 }} />
              <div style={{ width: "1px", background: "var(--bg2)", opacity: 0.9 }} />
              <div style={{ flex: 10 }} />
              <div style={{ width: "1px", background: "var(--bg2)", opacity: 0.9 }} />
              <div style={{ flex: 10 }} />
              <div style={{ width: "1px", background: "var(--bg2)", opacity: 0.9 }} />
              <div style={{ flex: 10 }} />
            </div>
            {/* pass fill between current and projected */}
            <div
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: leftPct(Math.min(baseScore, projected)) + "%",
                width: Math.abs(projected - baseScore) + "%",
                background: "var(--pass)",
                transition: reduced ? "none" : "left 0.35s ease, width 0.35s ease",
              }}
            />
            {/* current marker */}
            <div
              style={{
                position: "absolute",
                top: "-2px",
                bottom: "-2px",
                left: `calc(${leftPct(baseScore)}% - 1px)`,
                width: "2px",
                background: "var(--muted)",
                transition: reduced ? "none" : "left 0.35s ease",
              }}
            />
            {/* projected marker */}
            <div
              style={{
                position: "absolute",
                top: "-3px",
                bottom: "-3px",
                left: `calc(${leftPct(projected)}% - 1px)`,
                width: "2px",
                background: "var(--ink)",
                transition: reduced ? "none" : "left 0.35s ease",
              }}
            />
          </div>
          <div style={{ display: "flex", marginTop: "4px", fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--muted2)" }}>
            <span style={{ flex: 60, textAlign: "center" }}>F</span>
            <span style={{ flex: 10, textAlign: "center" }}>D</span>
            <span style={{ flex: 10, textAlign: "center" }}>C</span>
            <span style={{ flex: 10, textAlign: "center" }}>B</span>
            <span style={{ flex: 10, textAlign: "center" }}>A</span>
          </div>
        </div>
      </div>

      {/* Fix list — with FIX CONFIDENCE */}
      <div style={{ borderBottom: "1px solid var(--line)", padding: "6px 16px", display: "flex", gap: "8px", flexWrap: "wrap", fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--muted2)" }}>
        <span style={{ color: "var(--pass)", border: "1px solid var(--pass)", borderRadius: 3, padding: "0 4px" }}>HIGH direct patch fixed</span>
        <span style={{ color: "var(--warn)", border: "1px solid var(--warn)", borderRadius: 3, padding: "0 4px" }}>MEDIUM transitive override</span>
        <span style={{ color: "var(--crit)", border: "1px solid var(--crit)", borderRadius: 3, padding: "0 4px" }}>LOW major peer untested</span>
      </div>
      <div role="group" aria-label="Fix suggestions">
        {fixes.map((fix, idx) => {
          const isChecked = checked[idx];
          const riskLabel =
            fix.risk === "major" ? "major update, may break your build" : fix.risk === "minor" ? "minor update, safe" : "patch update, safe";
          const riskColor = fix.risk === "major" ? "var(--warn)" : "var(--muted)";
          const severityLabel = fix.severity.charAt(0).toUpperCase() + fix.severity.slice(1);
          const isTransitive = !!(fix as any).is_transitive;
          const knownFixed = fix.to !== "unknown" && !String(fix.to).includes("latest") && !String(fix.to).includes("x");
          let conf: "HIGH" | "MEDIUM" | "LOW" = "MEDIUM";
          let confReason = "";
          let confColor = "var(--warn)";
          if (fix.risk === "major") { conf = "LOW"; confReason = "major · peer deps · untested"; confColor = "var(--crit)"; }
          else if (isTransitive) { conf = "MEDIUM"; confReason = "transitive · override required"; confColor = "var(--warn)"; }
          else if (fix.risk === "patch" && knownFixed) { conf = "HIGH"; confReason = "direct · patch · fixed"; confColor = "var(--pass)"; }
          return (
            <label
              key={`${fix.pkg}-${idx}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "10px 16px",
                borderBottom: idx === fixes.length - 1 ? "none" : "1px solid var(--line)",
                cursor: "pointer",
                background: "transparent",
              }}
            >
              <span style={{ position: "relative", width: "16px", height: "16px", flexShrink: 0, display: "inline-block" }}>
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggle(idx)}
                  aria-label={`${fix.pkg} from ${fix.from} to ${fix.to}, ${severityLabel} ${fix.cvss}, ${riskLabel}, confidence ${conf}, plus ${fix.points} points`}
                  style={{
                    appearance: "none",
                    WebkitAppearance: "none",
                    width: "16px",
                    height: "16px",
                    border: "1px solid var(--line)",
                    borderRadius: "3px",
                    background: isChecked ? "var(--pass)" : "transparent",
                    borderColor: isChecked ? "var(--pass)" : "var(--line)",
                    cursor: "pointer",
                    outline: "none",
                    margin: 0,
                    display: "block",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.outline = "2px solid var(--pass)";
                    e.currentTarget.style.outlineOffset = "2px";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.outline = "none";
                  }}
                />
                <span
                  aria-hidden
                  style={{
                    position: "absolute",
                    left: "4px",
                    top: "1px",
                    width: "6px",
                    height: "9px",
                    borderRight: "2px solid var(--bg)",
                    borderBottom: "2px solid var(--bg)",
                    transform: "rotate(45deg)",
                    display: isChecked ? "block" : "none",
                    pointerEvents: "none",
                  }}
                />
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "block" }}>
                  {fix.pkg} {fix.from} → {fix.to}
                </span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--muted)", display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center", marginTop: "1px" }}>
                  <span style={{ color: "var(--muted)" }}>{severityLabel} {fix.cvss} · <span style={{ color: riskColor }}>{riskLabel}</span></span>
                  <span style={{ border: `1px solid ${confColor}`, color: confColor, borderRadius: 3, padding: "0 4px", fontSize: 9 }} title={confReason}>{conf}</span>
                </span>
              </span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", fontWeight: 500, color: "var(--pass)", flexShrink: 0 }}>+{fix.points}</span>
            </label>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{ padding: "12px 16px", borderTop: "1px solid var(--line)", background: "transparent" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "var(--bg)",
            border: "1px solid var(--line)",
            borderRadius: "4px",
            padding: "8px 8px 8px 10px",
            minWidth: 0,
            overflow: "hidden",
          }}
        >
          <span style={{ color: "var(--pass)", fontFamily: "var(--font-mono)", fontSize: "13px", flexShrink: 0 }}>$</span>
          <code
            style={{
              flex: 1,
              minWidth: 0,
              fontFamily: "var(--font-mono)",
              fontSize: "12px",
              color: hasSelection ? "var(--ink)" : "var(--muted2)",
              whiteSpace: "nowrap",
              overflowX: "auto",
              WebkitOverflowScrolling: "touch",
              scrollbarWidth: "thin",
            }}
          >
            {hasSelection ? combinedCommand : "Select fixes to generate command"}
          </code>
          <button
            onClick={handleCopy}
            disabled={!hasSelection}
            style={{
              flexShrink: 0,
              fontFamily: "var(--font-mono)",
              fontSize: "12px",
              fontWeight: 500,
              padding: "4px 10px",
              borderRadius: "4px",
              border: "1px solid var(--line)",
              background: hasSelection ? "var(--bg2)" : "transparent",
              color: hasSelection ? "var(--ink)" : "var(--muted2)",
              cursor: hasSelection ? "pointer" : "not-allowed",
              opacity: hasSelection ? 1 : 0.6,
              outline: "none",
            }}
            onFocus={(e) => {
              e.currentTarget.style.outline = "2px solid var(--pass)";
              e.currentTarget.style.outlineOffset = "2px";
            }}
            onBlur={(e) => {
              e.currentTarget.style.outline = "none";
            }}
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--muted)", marginTop: "8px" }} aria-live="polite">
          {remaining === 0 ? "All issues resolved" : `${remaining} ${remaining === 1 ? "issue" : "issues"} still open`}
        </div>
      </div>

      {/* responsive */}
      <style>{`
        @media (max-width: 360px) {
          /* ensure code box scrolls instead of wrapping */
        }
      `}</style>
    </div>
  );
}
