import { useState } from "react";
import { authLogin, authRegister } from "../api/client";

interface Props { onClose: () => void; onAuth: (token: string) => void; initialTab?: "login" | "register"; message?: string; }

export function AuthModal({ onClose, onAuth, initialTab = "register", message }: Props) {
  const [tab, setTab] = useState<"login" | "register">(initialTab);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const submit = async () => {
    setError(null);
    const em = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em) || em.length>254) { setError("Enter a valid email"); return; }
    if (password.length<8) { setError("Password must be at least 8 characters"); return; }
    if (password.length>128) { setError("Password too long"); return; }
    setLoading(true);
    try { const fn = tab==="login"?authLogin:authRegister; const d = await fn(em,password); onAuth(d.token); onClose(); }
    catch (e:any) { setError(typeof e.message==="string"?e.message.slice(0,200):"Failed"); }
    finally { setLoading(false); }
  };
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#12181F]/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#EDF1F4] border border-[#12181F] p-0 animate-slide-up">
        <div className="flex items-center justify-between border-b border-[#12181F] bg-[#E3E9ED] px-4 py-3">
          <h2 className="font-[Space_Grotesk] font-bold text-sm flex items-center gap-2"><span className="w-7 h-7 bg-[#12181F] text-[#EDF1F4] flex items-center justify-center text-xs">◈</span>{tab==="login"?"Sign In":"Create Account"}</h2>
          <button onClick={onClose} className="w-7 h-7 border border-[#12181F] flex items-center justify-center text-[#4C5A67] hover:bg-[#12181F] hover:text-[#EDF1F4]">✕</button>
        </div>
        {message && <div className="m-4 p-2.5 border border-[#A85419] bg-[#A85419]/10 text-[#A85419] text-xs font-mono">{message}</div>}
        <div className="flex gap-0 border-b border-[#12181F] mx-4 mt-4">
          {(["register","login"] as const).map(t=>(
            <button key={t} onClick={()=>setTab(t)} className={`flex-1 py-2 text-xs font-mono font-semibold border border-b-0 last:border-l-0 ${tab===t?"bg-[#12181F] text-[#EDF1F4] border-[#12181F]":"bg-white text-[#4C5A67] border-[#B7C3CB] hover:text-[#12181F]"}`}>{t==="register"?"Create account":"Sign in"}</button>
          ))}
        </div>
        <div className="p-4 space-y-3">
          <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" className="w-full px-3 py-2.5 bg-white border border-[#12181F] text-sm font-mono text-[#12181F] placeholder:text-[#8593A1] focus:outline-none focus:border-[#C1273B]" />
          <input value={password} onChange={e=>setPassword(e.target.value)} type="password" placeholder="password (min 8 chars)" autoComplete={tab==="login"?"current-password":"new-password"} className="w-full px-3 py-2.5 bg-white border border-[#12181F] text-sm font-mono text-[#12181F] placeholder:text-[#8593A1] focus:outline-none focus:border-[#C1273B]" onKeyDown={e=>e.key==="Enter"&&submit()} />
          {error && <p className="text-xs font-mono text-[#C1273B] border border-[#C1273B]/30 bg-[#C1273B]/5 px-2 py-1.5">{error}</p>}
          <button onClick={submit} disabled={loading} className="w-full py-2.5 bg-[#12181F] text-[#EDF1F4] border border-[#12181F] font-mono text-xs font-bold hover:bg-white hover:text-[#12181F] disabled:opacity-50 transition-colors">{loading?"Please wait…":tab==="login"?"Sign In — Unlimited scans":"Create Account — Unlimited scans"}</button>
          <p className="text-[11px] font-mono text-center text-[#8593A1]">Anonymous 5 scans. Accounts get unlimited.</p>
        </div>
      </div>
    </div>
  );
}
