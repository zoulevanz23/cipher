interface NavbarProps {
  onAbout: () => void;
  onHistory: () => void;
  onNews: () => void;
  onFeatures?: () => void;
  onHome?: () => void;
  activeView: string;
  auth?: { email: string; isAnonymous: boolean; credits: number } | null;
  onLogin?: () => void;
  onRegister?: () => void;
  onLogout?: () => void;
  onProfile?: () => void;
}

export function Navbar({ onAbout, onHistory, onNews, onFeatures, onHome, activeView, auth, onLogin, onRegister, onLogout, onProfile }: NavbarProps) {
  const link = (v: string, label: string, cb?: () => void) => (
    <button
      onClick={cb}
      className={`px-2 py-1 text-[12.5px] font-mono border-b transition-colors ${activeView === v ? "text-[#12181F] border-[#12181F]" : "text-[#4C5A67] border-transparent hover:text-[#12181F] hover:border-[#12181F]"}`}
    >
      {label}
    </button>
  );
  return (
    <header className="sticky top-0 z-40 bg-[rgba(237,241,244,0.92)] backdrop-blur-[6px] border-b border-[#12181F]">
      <div className="max-w-[1180px] mx-auto px-[18px] sm:px-[34px] h-[58px] flex items-center justify-between gap-4">
        <button onClick={() => onHome?.()} className="flex items-center gap-2.5 shrink-0">
          <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
            <rect x="1" y="1" width="24" height="24" fill="none" stroke="#12181F" strokeWidth="1.2"/>
            <line x1="1" y1="13" x2="25" y2="13" stroke="#12181F" strokeWidth="1"/>
            <line x1="13" y1="1" x2="13" y2="25" stroke="#12181F" strokeWidth="1"/>
            <circle cx="13" cy="13" r="3.5" fill="#C1273B"/>
          </svg>
          <span className="text-left leading-none">
            <span className="block font-[Space_Grotesk] font-bold text-[16px] tracking-tight">CIPHER</span>
            <span className="block text-[10px] tracking-[0.04em] text-[#8593A1] font-mono">VULNCHECKER</span>
          </span>
        </button>
        <nav className="hidden lg:flex items-center gap-6">
          {link("features", "Architecture", onFeatures)}
          {link("history", "Coverage", onHistory)}
          {link("news", "Live index", onNews)}
          {link("about", "Access control", onAbout)}
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="hidden sm:inline-flex items-center gap-1.5 border border-[#B7C3CB] px-2.5 py-1 text-[11px] font-mono text-[#4C5A67]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2C6E52]" style={{ animation: "pulse-live 2.2s ease-out infinite" }} />
            3 sources connected
          </span>
          {auth ? auth.isAnonymous ? (
            <>
              <span className="hidden sm:inline-flex text-[11px] font-mono px-2 py-1 border border-[#B7C3CB] text-[#12181F]">{auth.credits}/5 scans</span>
              <button onClick={onLogin} className="hidden sm:inline-flex text-xs font-mono font-semibold px-3 py-2 border border-[#12181F] hover:bg-[#12181F] hover:text-[#EDF1F4] transition-colors">Sign in</button>
              <button onClick={onRegister} className="text-xs font-mono font-semibold px-3 sm:px-4 py-2 bg-[#12181F] text-[#EDF1F4] border border-[#12181F] hover:bg-[#EDF1F4] hover:text-[#12181F] transition-colors">Get the CLI</button>
            </>
          ) : (
            <>
              <span className="hidden sm:inline text-[11px] font-mono text-[#4C5A67]">{auth.email}</span>
              <span className="hidden sm:inline-flex text-[11px] font-mono px-2 py-1 border border-[#2C6E52] text-[#2C6E52]">∞ unlimited</span>
              <button onClick={onProfile} className="text-xs font-mono px-2 py-1.5 border border-[#12181F]">Account</button>
              <button onClick={onLogout} className="text-xs font-mono text-[#4C5A67] hover:text-[#12181F] px-2">Sign out</button>
            </>
          ) : <span className="text-[11px] font-mono text-[#8593A1]">loading…</span>}
        </div>
      </div>
    </header>
  );
}
