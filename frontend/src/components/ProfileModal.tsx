import { useEffect, useState } from "react";
import { AuthMe, authMe, changePassword, deleteAccount } from "../api/client";
import { validatePassword } from "../api/validation";
import { toast } from "./Toast";

interface Props { email: string; onClose: () => void; onDeleted: () => void; }

/* Profile modal. Password tab calls POST /api/auth/password with the
   shared validators; danger tab arms only after typing the account
   email, then calls DELETE /api/auth/account (server row + scans). */

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

export function ProfileModal({ email, onClose, onDeleted }: Props) {
  if (!onClose || !onDeleted) return null;
  const [activeTab, setActiveTab] = useState<"profile" | "password" | "danger">("profile");
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwErr, setPwErr] = useState<string | null>(null);
  const [pwOk, setPwOk] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteErr, setDeleteErr] = useState<string | null>(null);
  /* Real account facts for the profile tab (member since, scans
     performed, credits) — loaded from /api/auth/me on open. */
  const [account, setAccount] = useState<AuthMe | null>(null);
  const [accountErr, setAccountErr] = useState(false);

  useEffect(() => {
    let live = true;
    authMe()
      .then((me) => { if (live) setAccount(me); })
      .catch(() => { if (live) setAccountErr(true); });
    return () => { live = false; };
  }, []);

  const armed = deleteConfirm.trim().toLowerCase() === email.trim().toLowerCase() && email.trim().length > 0;

  const submitPassword = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setPwErr(null); setPwOk(false);
    if (!currentPw) { setPwErr("Enter your current password."); return; }
    const v = validatePassword(newPw);
    if (v) { setPwErr(v); return; }
    if (newPw !== confirmPw) { setPwErr("New passwords do not match."); return; }
    if (newPw === currentPw) { setPwErr("New password must differ from the current one."); return; }
    setPwLoading(true);
    try {
      await changePassword(currentPw, newPw);
      setPwOk(true);
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
      toast("Password updated");
    } catch (err: any) {
      setPwErr(typeof err?.message === "string" ? err.message.slice(0, 200) : "Could not change password.");
    } finally {
      setPwLoading(false);
    }
  };

  const submitDelete = async () => {
    if (!armed || deleteLoading) return;
    setDeleteErr(null); setDeleteLoading(true);
    try {
      await deleteAccount();
      toast("Account deleted");
      onDeleted();
    } catch (err: any) {
      setDeleteErr(typeof err?.message === "string" ? err.message.slice(0, 200) : "Could not delete account.");
      setDeleteLoading(false);
    }
  };

  return (
    <div className="modal-overlay open" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth: "480px" }}>
        <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--muted)", marginBottom: "16px" }}>{email}</div>
        <div style={{ display: "flex", gap: "4px", marginBottom: "20px" }}>
          {(["profile", "password", "danger"] as const).map((t) => (
            <button key={t} type="button" onClick={() => setActiveTab(t)} style={{ padding: "6px 12px", background: activeTab === t ? "var(--line)" : "transparent", color: activeTab === t ? "var(--ink)" : "var(--muted)", fontFamily: "var(--font-mono)", fontSize: "12px", border: "none", borderRadius: "4px", cursor: "pointer", textTransform: "capitalize" }}>{t}</button>
          ))}
        </div>
        {activeTab === "profile" && (
          accountErr ? (
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--crit)" }}>Could not load account details.</div>
          ) : !account ? (
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--muted)" }}>Loading account…</div>
          ) : (
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--muted)", display: "grid", gap: "8px" }}>
              <div>Email: <span style={{ color: "var(--ink)" }}>{account.email}</span></div>
              <div>Plan: <span style={{ color: "var(--pass)" }}>{account.is_anonymous ? "Anonymous" : "Registered"}</span></div>
              <div>Member since: <span style={{ color: "var(--ink)" }}>{account.created_at ? account.created_at.slice(0, 10) : "—"}</span></div>
              <div>Scans performed: <span style={{ color: "var(--ink)" }}>{account.stats.scan_count}</span></div>
              <div>Vulnerabilities found: <span style={{ color: account.stats.total_vulnerabilities > 0 ? "var(--crit)" : "var(--pass)" }}>{account.stats.total_vulnerabilities}</span></div>
              {account.is_anonymous ? (
                <div>Credits: <span style={{ color: "var(--ink)" }}>{account.credits.credits}/5</span><span style={{ color: "var(--muted2)" }}> · resets in {account.credits.reset_in_hours}h</span></div>
              ) : (
                <div>Scans: <span style={{ color: "var(--ink)" }}>∞ unlimited</span></div>
              )}
            </div>
          )
        )}
        {activeTab === "password" && (
          <form onSubmit={submitPassword} noValidate>
            <div className="field">
              <label className="field-label" htmlFor="pw-current">Current password</label>
              <input id="pw-current" type="password" autoComplete="current-password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} placeholder="••••••••" style={inputStyle} />
            </div>
            <div className="field">
              <label className="field-label" htmlFor="pw-new">New password (8+ characters)</label>
              <input id="pw-new" type="password" autoComplete="new-password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="••••••••" style={inputStyle} />
            </div>
            <div className="field">
              <label className="field-label" htmlFor="pw-confirm">Confirm new password</label>
              <input id="pw-confirm" type="password" autoComplete="new-password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} placeholder="••••••••" style={inputStyle} />
            </div>
            {pwErr && <div style={{ ...errStyle, marginBottom: "12px" }}>{pwErr}</div>}
            {pwOk && <div style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--pass)", marginBottom: "12px" }}>Password updated.</div>}
            <button type="submit" disabled={pwLoading} className="btn btn-primary" style={{ width: "100%", opacity: pwLoading ? 0.6 : 1 }}>
              {pwLoading ? "Updating…" : "Update password"}
            </button>
          </form>
        )}
        {activeTab === "danger" && (
          <div style={{ border: "1px solid rgba(255,92,92,.4)", borderRadius: "8px", padding: "16px" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--crit)", marginBottom: "12px" }}>Delete account</div>
            <p style={{ fontFamily: "var(--font-sans)", fontSize: "13px", color: "var(--muted)", marginBottom: "12px", lineHeight: 1.6 }}>
              This permanently deletes your account, scan history, and saved data. Type <span style={{ fontFamily: "var(--font-mono)", color: "var(--ink)" }}>{email}</span> to arm the button.
            </p>
            <input type="email" autoComplete="off" value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} placeholder={email} style={{ ...inputStyle, marginBottom: "12px" }} />
            {deleteErr && <div style={{ ...errStyle, marginBottom: "12px" }}>{deleteErr}</div>}
            <button type="button" onClick={submitDelete} disabled={!armed || deleteLoading} className="btn btn-danger" style={{ width: "100%", opacity: !armed || deleteLoading ? 0.4 : 1 }}>
              {deleteLoading ? "Deleting…" : "Delete account"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
