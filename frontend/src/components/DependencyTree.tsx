interface Props {
  dependencies?: { name: string; version: string }[];
  packageName: string;
}

export function DependencyTree({ dependencies, packageName }: Props) {
  if (!dependencies || dependencies.length === 0) return null;
  return (
    <div style={{marginLeft:"16px", borderLeft:"1px solid var(--line)", paddingLeft:"12px", marginBottom:"8px", marginTop:"8px"}}>
      <div style={{fontFamily:"var(--font-mono)", fontSize:"11px", color:"var(--muted)", marginBottom:"4px", display:"flex", alignItems:"center", gap:"4px"}}>
        <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="var(--muted)" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4"/></svg>
        <span>{packageName}</span>
      </div>
      {dependencies.map((dep) => (
        <div key={dep.name} style={{fontFamily:"var(--font-mono)", fontSize:"11px", color:"var(--muted)", padding:"2px 0", display:"flex", alignItems:"center", gap:"4px"}}>
          <span style={{color:"var(--muted2)"}}>└──</span>
          <span style={{color:"var(--ink)"}}>{dep.name}</span>
          <span style={{color:"var(--muted2)"}}>@{dep.version}</span>
        </div>
      ))}
    </div>
  );
}
