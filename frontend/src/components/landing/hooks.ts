import { useEffect, useRef, useState } from "react";

/* Shared hooks for the Cipher VulnChecker landing page.
   All ambient animation honors IntersectionObserver once-trigger +
   prefers-reduced-motion (see CSS guards in index.css). */

// Observe visibility once (counters, reveals).
export function useInView<T extends HTMLElement>(threshold = 0.2) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ob = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setInView(true); },
      { threshold }
    );
    ob.observe(el);
    return () => ob.disconnect();
  }, [threshold]);
  return { ref, inView };
}

// Fire a callback on every viewport entry (pipeline pulse replays).
export function useInViewEnter<T extends HTMLElement>(onEnter: () => void, threshold = 0.3) {
  const ref = useRef<T | null>(null);
  const cb = useRef(onEnter);
  cb.current = onEnter;
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ob = new IntersectionObserver(
      (es) => { es.forEach((e) => { if (e.isIntersecting) cb.current(); }); },
      { threshold }
    );
    ob.observe(el);
    return () => ob.disconnect();
  }, [threshold]);
  return ref;
}

export function usePrefersReducedMotion() {
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

// Terse counter increment (~600ms linear) for the stats bar.
export function useCountUp(target: number, start: boolean, duration = 600) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!start) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setVal(target);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      setVal(Math.round(target * p));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [start, target, duration]);
  return val;
}

/* ─── Animation primitives ─── */

// Once-trigger step sequence: advances to step i when its
// delay fires, resets to -1 when `start` flips false.
export function useStepSequence(start: boolean, count: number, getDelay: (i: number) => number): number {
  const [step, setStep] = useState(-1);
  const getDelayRef = useRef(getDelay);
  getDelayRef.current = getDelay;
  useEffect(() => {
    if (!start) { setStep(-1); return; }
    let mounted = true;
    const timers: number[] = [];
    for (let i = 0; i < count; i++) {
      timers.push(window.setTimeout(() => { if (mounted) setStep(i); }, getDelayRef.current(i)));
    }
    return () => { mounted = false; timers.forEach(clearTimeout); };
  }, [start, count]);
  return step;
}

// Typewriter: types each line char-by-char after `initialDelay`,
// one char every `intervalMs`, 120ms gap between lines.
// Returns `displayed` (growing strings) + `done`.
export function useTypewriter(start: boolean, lines: string[], intervalMs = 50): { displayed: string[]; done: boolean } {
  const [lengths, setLengths] = useState<number[]>(() => lines.map(() => 0));
  const [done, setDone] = useState(!start);
  useEffect(() => {
    if (!start) { setLengths(lines.map(() => 0)); setDone(!start); return; }
    // Pre-compute the delay schedule for every character.
    const schedule: Array<{ delay: number; line: number }> = [];
    let t = 200;
    for (let li = 0; li < lines.length; li++) {
      for (let ci = 0; ci < lines[li].length; ci++) {
        schedule.push({ delay: t, line: li });
        t += intervalMs;
      }
      t += 130;
    }
    const total = t;
    let mounted = true;
    const timers = schedule.map((s) => window.setTimeout(() => {
      if (!mounted) return;
      setLengths((prev) => { const n = [...prev]; n[s.line] = prev[s.line] + 1; return n; });
    }, s.delay));
    timers.push(window.setTimeout(() => { if (mounted) setDone(true); }, total));
    return () => { mounted = false; timers.forEach(clearTimeout); };
  }, [start]); // lines are static literals
  const displayed = lines.map((l, i) => l.slice(0, lengths[i]));
  return { displayed, done };
}
