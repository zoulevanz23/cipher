import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, authGoogle, authLogin, authRegister } from "../api/client";
import { normalizeEmail, validateConfirm, validateEmail, validatePassword } from "../api/validation";
import { toast } from "./Toast";

interface Props { onClose: () => void; onAuth: () => void; initialTab?: "login" | "register"; }

/* "Continue with Google" needs a public OAuth client id. Until the
   deployer sets VITE_GOOGLE_CLIENT_ID (+ CIPHER_GOOGLE_CLIENT_ID on
   the server), the section stays hidden instead of showing a dead
   button. Read at render time so tests can stub the env. */
function googleClientId(): string | undefined {
  // import.meta in the browser build; process.env fallback lets tests
  // stub the value (vitest 5's stubEnv only covers process.env).
  const fromMeta = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID;
  const fromProc = typeof process !== "undefined" ? (process as any).env?.VITE_GOOGLE_CLIENT_ID : undefined;
  const v = fromMeta ?? fromProc;
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

let gisPromise: Promise<void> | null = null;
function loadGis(): Promise<void> {
  if (gisPromise) return gisPromise;
  gisPromise = new Promise((resolve, reject) => {
    if ((window as any).google?.accounts?.id) { resolve(); return; }
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("gis-load-failed"));
    document.head.appendChild(s);
  });
  return gisPromise;
}

/* Account modal: Sign in vs Create account tabs route to DIFFERENT
   endpoints (authLogin / authRegister). Client validation mirrors
   the backend (api/validation.ts) so rejections match byte for byte;
   server statuses are mapped (409 → suggest sign-in, 429 → wait). */

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 12px", background: "var(--bg)",
  border: "1px solid var(--line)", borderRadius: "4px",
  fontFamily: "var(--font-mono)", fontSize: "13px",
  color: "var(--ink)", outline: "none", boxSizing: "border-box",
};
const errStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono)", fontSize: "11px",
  color: "var(--crit)", marginTop: "4px",
};

export function AuthModal({ onClose, onAuth, initialTab = "register" }: Props) {
  if (!onClose || !onAuth) return null;
  const [tab, setTab] = useState<"login" | "register">(initialTab);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [fieldErr, setFieldErr] = useState<{ email?: string; password?: string; confirm?: string }>({});
  const [serverErr, setServerErr] = useState<string | null>(null);
  const [conflictEmail, setConflictEmail] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const googleBtnRef = useRef<HTMLDivElement | null>(null);
  // Latest callbacks for the GIS credential handler (registered once).
  const authRef = useRef({ onAuth, onClose });
  authRef.current = { onAuth, onClose };

  const handleGoogle = useCallback(async (resp: { credential?: string }) => {
    if (!resp?.credential) { setServerErr("Google sign-in was cancelled."); return; }
    setServerErr(null); setConflictEmail(false); setLoading(true);
    try {
      const r = await authGoogle(resp.credential);
      toast(r.is_new ? "Google account created — unlimited scans" : "Signed in with Google — unlimited scans");
      authRef.current.onAuth();
      authRef.current.onClose();
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 500) {
        setServerErr("Google sign-in is not configured on this server.");
      } else {
        setServerErr(typeof err?.message === "string" ? err.message.slice(0, 200) : "Google sign-in failed.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const clientId = googleClientId();
    if (!clientId) return;
    let live = true;
    loadGis()
      .then(() => {
        if (!live) return;
        const google = (window as any).google;
        google.accounts.id.initialize({ client_id: clientId, callback: handleGoogle, auto_select: false });
        if (googleBtnRef.current) {
          google.accounts.id.renderButton(googleBtnRef.current, { theme: "outline", size: "large", width: 320, text: "continue_with" });
          setGoogleReady(true);
        }
      })
      .catch(() => { /* GIS unreachable: section stays in loading state, form still works */ });
    return () => { live = false; };
  }, [handleGoogle]);

  const switchTab = (t: "login" | "register") => {
    setTab(t); setFieldErr({}); setServerErr(null); setConflictEmail(false);
  };

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setServerErr(null); setConflictEmail(false);
    const errs: typeof fieldErr = {};
    const emailErr = validateEmail(email);
    if (emailErr) errs.email = emailErr;
    const pwErr = validatePassword(password);
    if (pwErr) errs.password = pwErr;
    if (tab === "register") {
      const cErr = validateConfirm(password, confirm);
      if (cErr) errs.confirm = cErr;
    }
    setFieldErr(errs);
    if (Object.keys(errs).length > 0) return;
    setLoading(true);
    try {
      if (tab === "login") await authLogin(normalizeEmail(email), password);
      else await authRegister(normalizeEmail(email), password);
      toast(tab === "login" ? "Signed in — unlimited scans" : "Account created — unlimited scans");
      onAuth();
      onClose();
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 409 && tab === "register") {
        setConflictEmail(true);
        setServerErr("Email already registered.");
      } else if (err instanceof ApiError && err.status === 429) {
        setServerErr(typeof err.message === "string" ? err.message.slice(0, 200) : "Too many attempts — try again later.");
      } else if (err instanceof ApiError && err.status === 401) {
        setServerErr("Invalid email or password.");
      } else {
        setServerErr(typeof err?.message === "string" ? err.message.slice(0, 200) : "Authentication failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay open" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--muted)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "16px" }}>
          {tab === "login" ? "Sign in" : "Create account"}
        </div>
        <div style={{ display: "flex", gap: "4px", background: "var(--bg)", borderRadius: "4px", padding: "3px", marginBottom: "20px" }}>
          <button type="button" onClick={() => switchTab("login")} style={{ flex: 1, padding: "6px", background: tab === "login" ? "var(--line)" : "transparent", color: tab === "login" ? "var(--ink)" : "var(--muted)", fontFamily: "var(--font-mono)", fontSize: "13px", border: "none", borderRadius: "4px", cursor: "pointer" }}>Sign in</button>
          <button type="button" onClick={() => switchTab("register")} style={{ flex: 1, padding: "6px", background: tab === "register" ? "var(--line)" : "transparent", color: tab === "register" ? "var(--ink)" : "var(--muted)", fontFamily: "var(--font-mono)", fontSize: "13px", border: "none", borderRadius: "4px", cursor: "pointer" }}>Register</button>
        </div>
        <form onSubmit={submit} noValidate>
          <div className="field">
            <label className="field-label" htmlFor="auth-email">Email</label>
            <input id="auth-email" type="email" autoFocus autoComplete="email" value={email} onChange={(e) => { setEmail(e.target.value); setFieldErr((f) => ({ ...f, email: undefined })); }} placeholder="you@example.com" style={{ ...inputStyle, borderColor: fieldErr.email ? "var(--crit)" : "var(--line)" }} />
            {fieldErr.email && <div style={errStyle}>{fieldErr.email}</div>}
          </div>
          <div className="field">
            <label className="field-label" htmlFor="auth-password">Password</label>
            <div style={{ position: "relative" }}>
              <input id="auth-password" type={showPw ? "text" : "password"} autoComplete={tab === "login" ? "current-password" : "new-password"} value={password} onChange={(e) => { setPassword(e.target.value); setFieldErr((f) => ({ ...f, password: undefined })); }} placeholder="••••••••" style={{ ...inputStyle, paddingRight: "64px", borderColor: fieldErr.password ? "var(--crit)" : "var(--line)" }} />
              <button type="button" onClick={() => setShowPw((s) => !s)} style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", color: "var(--muted)", fontFamily: "var(--font-mono)", fontSize: "11px", cursor: "pointer" }}>
                {showPw ? "hide" : "show"}
              </button>
            </div>
            {fieldErr.password && <div style={errStyle}>{fieldErr.password}</div>}
          </div>
          {tab === "register" && (
            <div className="field">
              <label className="field-label" htmlFor="auth-confirm">Confirm password</label>
              <input id="auth-confirm" type={showPw ? "text" : "password"} autoComplete="new-password" value={confirm} onChange={(e) => { setConfirm(e.target.value); setFieldErr((f) => ({ ...f, confirm: undefined })); }} placeholder="••••••••" style={{ ...inputStyle, borderColor: fieldErr.confirm ? "var(--crit)" : "var(--line)" }} />
              {fieldErr.confirm && <div style={errStyle}>{fieldErr.confirm}</div>}
            </div>
          )}
          {serverErr && (
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--crit)", marginBottom: "12px" }}>
              {serverErr}
              {conflictEmail && (
                <button type="button" onClick={() => switchTab("login")} style={{ display: "block", marginTop: "6px", background: "transparent", border: "none", padding: 0, color: "var(--muted)", fontFamily: "var(--font-mono)", fontSize: "12px", cursor: "pointer", textDecoration: "underline" }}>
                  Switch to sign in →
                </button>
              )}
            </div>
          )}
          <button type="submit" data-testid="auth-submit" disabled={loading} className="btn btn-primary" style={{ width: "100%", opacity: loading ? 0.6 : 1 }}>
            {loading ? "Working…" : tab === "login" ? "Sign in" : "Create account"}
          </button>
        </form>
        {googleClientId() && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", margin: "16px 0 12px" }}>
              <div style={{ flex: 1, height: "1px", background: "var(--line)" }} />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--muted2)" }}>or</span>
              <div style={{ flex: 1, height: "1px", background: "var(--line)" }} />
            </div>
            <div ref={googleBtnRef} style={{ display: "flex", justifyContent: "center" }} />
            {!googleReady && (
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--muted2)", textAlign: "center", marginTop: "8px" }}>
                Loading Google sign-in…
              </div>
            )}
          </>
        )}
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--muted2)", textAlign: "center", marginTop: "12px" }}>
          or <a href="#" onClick={(ev) => { ev.preventDefault(); onClose(); toast("Continuing anonymously — 5 scans/day"); }} style={{ color: "var(--muted)", textDecoration: "underline" }}>continue anonymously</a>
        </p>
      </div>
    </div>
  );
}
