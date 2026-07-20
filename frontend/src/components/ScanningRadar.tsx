import { useEffect, useRef } from "react";

export function ScanningRadar() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let progress = 0;

    const draw = () => {
      progress += 0.003;
      if (progress > 2) progress = 0;

      ctx.clearRect(0, 0, 80, 80);
      const cx = 40, cy = 40, maxR = 32;

      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR);
      bg.addColorStop(0, "rgba(0, 255, 65, 0.06)");
      bg.addColorStop(1, "rgba(0, 255, 65, 0)");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, 80, 80);

      ctx.strokeStyle = "rgba(0, 255, 65, 0.08)";
      ctx.lineWidth = 0.5;
      for (let i = 1; i <= 3; i++) {
        ctx.beginPath();
        ctx.arc(cx, cy, maxR * (i / 3), 0, Math.PI * 2);
        ctx.stroke();
      }

      const ringR = maxR * (progress % 1);
      const alpha = 1 - (progress % 1);
      ctx.beginPath();
      ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(0, 255, 65, ${alpha * 0.4})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(180, 255, 180, ${alpha * 0.12})`;
      ctx.lineWidth = 5;
      ctx.stroke();

      animId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animId);
  }, []);

  return <canvas ref={canvasRef} width={80} height={80} className="block" />;
}
