import { usePrefersReducedMotion } from "./hooks";

/* Quiet dependency-graph texture for hero + final CTA.
   Monochrome --line nodes/edges only (no status colors here);
   slow positional drift (28s). Decorative: pointer-events none,
   paused visually under prefers-reduced-motion. */

// Deterministic tree: root + 5 direct + 12 transitive nodes.
const NODES: Array<{ x: number; y: number; r: number; g: number }> = [
  { x: 70, y: 210, r: 6, g: 0 },
  { x: 250, y: 80, r: 4, g: 1 }, { x: 250, y: 160, r: 4, g: 0 }, { x: 250, y: 240, r: 4, g: 2 },
  { x: 250, y: 320, r: 4, g: 1 }, { x: 250, y: 380, r: 4, g: 0 },
  { x: 440, y: 40, r: 3, g: 1 }, { x: 440, y: 105, r: 3, g: 2 }, { x: 440, y: 150, r: 3, g: 0 },
  { x: 440, y: 195, r: 3, g: 1 }, { x: 440, y: 250, r: 3, g: 2 }, { x: 440, y: 300, r: 3, g: 0 },
  { x: 440, y: 350, r: 3, g: 1 },
  { x: 640, y: 70, r: 3, g: 2 }, { x: 640, y: 170, r: 3, g: 0 }, { x: 640, y: 270, r: 3, g: 1 },
  { x: 640, y: 350, r: 3, g: 2 },
  { x: 830, y: 140, r: 3, g: 0 }, { x: 830, y: 260, r: 3, g: 1 },
];
const EDGES: Array<[number, number]> = [
  [0, 1], [0, 2], [0, 3], [0, 4], [0, 5],
  [1, 6], [1, 7], [2, 8], [2, 9], [3, 10],
  [4, 11], [4, 12], [5, 12],
  [6, 13], [8, 14], [10, 15], [11, 16], [7, 17], [9, 18],
];

export function HeroGraph({ opacity = 0.12, slow = false }: { opacity?: number; slow?: boolean }) {
  const reduced = usePrefersReducedMotion();
  const groups = [0, 1, 2].map((g) => ({
    nodes: NODES.map((n, i) => ({ ...n, i })).filter((n) => n.g === g),
  }));
  return (
    <div className="lp-hero-graph" style={{ opacity }} aria-hidden="true">
      <svg viewBox="0 0 1000 420" preserveAspectRatio="xMidYMid slice">
        {groups.map((grp, gi) => (
          <g
            key={gi}
            className={!reduced ? "graph-drift" : undefined}
            style={!reduced ? { animationDelay: `${gi * (slow ? 9 : 5)}s`, animationDuration: slow ? "44s" : "28s" } : undefined}
          >
            {EDGES.map(([a, b], ei) => (
              <line key={ei} x1={NODES[a].x} y1={NODES[a].y} x2={NODES[b].x} y2={NODES[b].y} stroke="var(--line)" strokeWidth={1} />
            )).filter((_, ei) => grp.nodes.some((n) => n.i === EDGES[ei][0] || n.i === EDGES[ei][1]))}
            {grp.nodes.map((n) => (
              <circle key={n.i} cx={n.x} cy={n.y} r={n.r} fill="none" stroke="var(--line)" strokeWidth={1.2} />
            ))}
          </g>
        ))}
      </svg>
    </div>
  );
}
