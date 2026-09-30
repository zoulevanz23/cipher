export function PageTransition({ children }: { children: React.ReactNode }) {
  return <div style={{opacity:1, transition:"opacity var(--dur-base) var(--ease)"}}>{children}</div>;
}
