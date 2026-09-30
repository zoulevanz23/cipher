interface Props {
  breakdown: { critical:number; high:number; medium:number; low:number };
}

const SEV = { critical:"var(--crit)", high:"var(--high)", medium:"var(--warn)", low:"var(--pass)" };
const LABELS = { critical:"CRITICAL", high:"HIGH", medium:"MEDIUM", low:"LOW" };

export function SeverityChart({ breakdown }: Props) {
  const max = Math.max(breakdown.critical, breakdown.high, breakdown.medium, breakdown.low, 1);
  return (
    <div style={{border:"1px solid var(--line)", borderRadius:"8px", padding:"12px 16px", background:"var(--bg2)"}}>
      <h4 style={{fontFamily:"var(--font-mono)", fontSize:"11px", color:"var(--muted)", letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:"8px", fontWeight:600}}>Severity Breakdown</h4>
      <div style={{display:"flex", flexDirection:"column", gap:"6px"}}>
        {(Object.keys(SEV) as Array<keyof typeof SEV>).map((key) => (
          <div key={key} style={{display:"flex", alignItems:"center", gap:"8px"}}>
            <span style={{fontFamily:"var(--font-mono)", fontSize:"10px", color:"var(--muted)", width:"56px", textAlign:"right"}}>{LABELS[key]}</span>
            <div style={{flex:"1", height:"6px", background:"var(--bg)", borderRadius:"3px", overflow:"hidden"}}>
              <div style={{width:`${(breakdown[key]/max)*100}%`, height:"100%", background:SEV[key], borderRadius:"3px", transition:"width var(--dur-base) var(--ease)"}} />
            </div>
            <span style={{fontFamily:"var(--font-mono)", fontSize:"11px", fontWeight:600, color:SEV[key], width:"24px", textAlign:"right"}}>{breakdown[key]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
