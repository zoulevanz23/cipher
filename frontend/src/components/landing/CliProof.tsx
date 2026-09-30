import { useTypewriter, useInView } from "./hooks";
import { CopyButton } from "../CopyButton";

/* CLI proof: the credibility anchor. Real runnable commands in a
   terminal block (--bg fill, --pass prompt). Typewriter line-print
   on scroll-into-view (reuses the hero's exact pattern). Copy
   affordance via the shared CopyButton. */

const LINES = [
  { prompt: true, text: "pip install cipher" },
  { prompt: true, text: "cipher --path . --format sarif --fail-on high" },
  { prompt: true, text: "cipher --path . --format json > results.json" },
];

export function CliProof() {
  const { ref, inView } = useInView<HTMLDivElement>(0.2);
  const { displayed, done } = useTypewriter(inView, LINES.map((l) => (l.prompt ? "$ " : "") + l.text), 50);
  return (
    <section ref={ref} id="cli" style={{ scrollMarginTop: "72px" }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--muted)", letterSpacing: "0.06em", marginBottom: "8px" }}>PROOF</div>
      <h2 style={{ fontFamily: "var(--font-sans)", fontSize: "24px", fontWeight: 700, color: "var(--ink)", margin: "0 0 8px" }}>Trust output, not copy.</h2>
      <p style={{ fontFamily: "var(--font-sans)", fontSize: "15px", color: "var(--muted)", margin: "0 0 20px" }}>Same engine in your terminal, your editor, and your pipeline.</p>
      <div style={{ background: "var(--bg)", border: "1px solid var(--line)", borderRadius: "4px", padding: "20px", position: "relative" }}>
        <div style={{ position: "absolute", top: "12px", right: "12px" }}>
          <CopyButton content={LINES.map((l) => (l.prompt ? "$ " : "") + l.text).join("\n")} />
        </div>
        {displayed.map((line, i) => (
          <div key={i} style={{ fontFamily: "var(--font-mono)", fontSize: "14px", lineHeight: 2, color: "var(--ink)" }}>
            <span style={{ color: "var(--pass)", marginRight: "8px" }}>$</span>{line}
            {i === displayed.length - 1 && !done && <span className="tw-cursor" style={{ color: "var(--pass)" }} />}
          </div>
        ))}
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--muted2)", marginTop: "8px" }}>
          # also: VS Code extension · GitHub Action · direct API
        </div>
      </div>
    </section>
  );
}
