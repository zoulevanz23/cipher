import { useEffect, useRef } from "react";

const severities = [
  { label: "CRITICAL", color: "#ff4757" },
  { label: "HIGH", color: "#ff6348" },
  { label: "MEDIUM", color: "#ffa502" },
  { label: "LOW", color: "#2ed573" },
];

interface Target {
  a: number;
  d: number;
  severity: (typeof severities)[number];
}

interface Ring {
  progress: number;
  speed: number;
}

export function RadarScan() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let rings: Ring[] = [];

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };

    const targets: Target[] = Array.from({ length: 16 }, () => ({
      a: Math.random() * Math.PI * 2,
      d: 0.15 + Math.random() * 0.6,
      severity: severities[Math.floor(Math.random() * severities.length)],
    }));

    const draw = () => {
      resize();

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height * 0.45;
      const maxR = Math.min(canvas.width, canvas.height) * 0.7;

      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR);
      bg.addColorStop(0, "rgba(0, 255, 65, 0.03)");
      bg.addColorStop(1, "rgba(0, 255, 65, 0)");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = "rgba(0, 255, 65, 0.04)";
      ctx.lineWidth = 0.5;
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        ctx.arc(cx, cy, maxR * ((i + 1) / 6), 0, Math.PI * 2);
        ctx.stroke();
      }

      for (const t of targets) {
        const dist = maxR * t.d;
        const x = cx + Math.cos(t.a) * dist;
        const y = cy + Math.sin(t.a) * dist;
        const c = t.severity.color;

        let isLit = false;
        for (const ring of rings) {
          const ringR = maxR * ring.progress;
          if (Math.abs(dist - ringR) < maxR * 0.06) {
            isLit = true;
            break;
          }
        }

        ctx.beginPath();
        ctx.arc(x, y, isLit ? 4 : 1.5, 0, Math.PI * 2);
        ctx.fillStyle = isLit ? c : c + "50";
        ctx.fill();

        if (isLit) {
          ctx.beginPath();
          ctx.arc(x, y, 8, 0, Math.PI * 2);
          ctx.fillStyle = c + "20";
          ctx.fill();

          ctx.font = "8px 'JetBrains Mono', monospace";
          ctx.textAlign = "center";
          ctx.fillStyle = c;
          ctx.fillText(t.severity.label, x, y - 12);
        }
      }

      rings = rings.filter((r) => r.progress < 1);
      if (rings.length === 0 || rings[rings.length - 1].progress > 0.35) {
        rings.push({ progress: 0, speed: 0.0008 + Math.random() * 0.0004 });
      }

      for (const ring of rings) {
        ring.progress += ring.speed;
        const r = maxR * ring.progress;
        const alpha = 1 - ring.progress;

        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0, 255, 65, ${alpha * 0.25})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      animId = requestAnimationFrame(draw);
    };

    draw();
    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ opacity: 0.7 }}
    />
  );
}
