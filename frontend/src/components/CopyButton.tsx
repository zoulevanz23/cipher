import { useState } from "react";

interface Props { content: string; }

export function CopyButton({ content }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button onClick={handleCopy} style={{fontFamily:"var(--font-mono)", fontSize:"11px", padding:"4px 10px", background:"transparent", border:"1px solid var(--line)", borderRadius:"4px", color:copied?"var(--pass)":"var(--muted)", cursor:"pointer", transition:"all var(--dur-base) var(--ease)"}}>
      {copied ? "copied" : "copy"}
    </button>
  );
}
