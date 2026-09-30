export function ThemeToggle() {
  return (
    <button style={{fontFamily:"var(--font-mono)", fontSize:"11px", padding:"4px 10px", background:"transparent", border:"1px solid var(--line)", borderRadius:"4px", color:"var(--muted)", cursor:"pointer", transition:"all var(--dur-base) var(--ease)"}}>
      Theme
    </button>
  );
}
