import { NavbarProps } from "../types";

export function Navbar({ onAbout, onHistory, onNews, onFeatures, onHome, onScanner, onResults, activeView, auth, onLogout, onProfile, onSignIn }: NavbarProps) {
  return (
    <header className="navbar">
      <div className="nav-inner">
        <a href="#" onClick={(e) => { e.preventDefault(); onHome?.(); }} className="logo">CIPHER<span>.</span></a>
        <nav>
          <a href="#" onClick={(e) => { e.preventDefault(); onScanner?.(); }} className={activeView === "scanner" ? "active" : ""}>Scanner</a>
          <a href="#" onClick={(e) => { e.preventDefault(); onFeatures?.(); }} className={activeView === "features" ? "active" : ""}>Features</a>
          <a href="#" onClick={(e) => { e.preventDefault(); onHistory?.(); }} className={activeView === "history" ? "active" : ""}>History</a>
          <a href="#" onClick={(e) => { e.preventDefault(); onNews?.(); }} className={activeView === "news" ? "active" : ""}>News</a>
          <a href="#" onClick={(e) => { e.preventDefault(); onAbout?.(); }} className={activeView === "about" ? "active" : ""}>About</a>
        </nav>
        <div className="nav-right">
          {auth && !auth.isAnonymous && <span className="credits">∞ unlimited</span>}
          {auth && auth.isAnonymous && <span className="credits">{auth.credits}/5 scans</span>}
          {onResults && <button onClick={onResults} className="btn btn-sm" style={activeView === "results" ? {background:"var(--line)", color:"var(--ink)"} : undefined}>Results</button>}
          <button onClick={onProfile} className="btn btn-sm">Account</button>
          {/* No account yet (anonymous) → offer Sign in, never Sign out.
              Signed-in users get the real Sign out. */}
          {auth && !auth.isAnonymous
            ? <button onClick={onLogout} className="btn btn-sm">Sign out</button>
            : <button onClick={onSignIn} className="btn btn-sm">Sign in</button>}
        </div>
      </div>
    </header>
  );
}
