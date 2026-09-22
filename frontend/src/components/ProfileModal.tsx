import { useState } from "react";
import { changePassword, deleteAccount } from "../api/client";

interface ProfileModalProps {
  email: string;
  onClose: () => void;
  onDeleted: () => void;
}

export function ProfileModal({ email, onClose, onDeleted }: ProfileModalProps) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const submitPassword = async () => {
    setError(null);
    setMessage(null);
    if (next.length < 8) { setError("New password must be at least 8 characters"); return; }
    if (next !== confirm) { setError("New passwords do not match"); return; }
    setBusy(true);
    try {
      await changePassword(current, next);
      setMessage("Password updated");
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not change password");
    } finally {
      setBusy(false);
    }
  };

  const submitDelete = async () => {
    setError(null);
    setBusy(true);
    try {
      await deleteAccount();
      onDeleted();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete account");
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md glass rounded-2xl border border-border p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg scan-gradient flex items-center justify-center text-white text-sm">⚙</span>
            Account
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-gray-400 hover:text-white">✕</button>
        </div>

        <div className="mb-5 p-3 rounded-xl bg-surface-2/60 border border-border text-xs font-mono text-gray-400">
          signed in as <span className="text-accent">{email}</span>
        </div>

        {message && <p className="mb-3 text-xs font-mono text-emerald-400">{message}</p>}
        {error && <p className="mb-3 text-xs font-mono text-critical">{error}</p>}

        <div className="space-y-3 mb-6">
          <h3 className="text-xs font-mono text-gray-500 uppercase tracking-wider">Change password</h3>
          <input value={current} onChange={(e) => setCurrent(e.target.value)} type="password" autoComplete="current-password" placeholder="current password" className="w-full px-3 py-2.5 rounded-xl bg-[#0a0a0e] border border-border text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent/50" />
          <input value={next} onChange={(e) => setNext(e.target.value)} type="password" autoComplete="new-password" placeholder="new password (min 8 chars)" className="w-full px-3 py-2.5 rounded-xl bg-[#0a0a0e] border border-border text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent/50" />
          <input value={confirm} onChange={(e) => setConfirm(e.target.value)} type="password" autoComplete="new-password" placeholder="confirm new password" className="w-full px-3 py-2.5 rounded-xl bg-[#0a0a0e] border border-border text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent/50" onKeyDown={(e) => e.key === "Enter" && submitPassword()} />
          <button onClick={submitPassword} disabled={busy} className="w-full py-2.5 rounded-xl bg-accent text-black font-bold text-sm font-mono disabled:opacity-50">
            {busy ? "Please wait..." : "Update password"}
          </button>
        </div>

        <div className="pt-4 border-t border-border space-y-3">
          <h3 className="text-xs font-mono text-gray-500 uppercase tracking-wider">Danger zone</h3>
          {!confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)} className="w-full py-2.5 rounded-xl border border-critical/40 text-critical text-sm font-mono hover:bg-critical/10">
              Delete account…
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-mono text-critical">Delete your account and scan history? This cannot be undone.</p>
              <div className="flex gap-2">
                <button onClick={submitDelete} disabled={busy} className="flex-1 py-2 rounded-xl bg-critical text-white text-xs font-mono disabled:opacity-50">
                  {busy ? "Deleting…" : "Yes, delete"}
                </button>
                <button onClick={() => setConfirmDelete(false)} className="flex-1 py-2 rounded-xl border border-border text-gray-400 text-xs font-mono hover:text-white">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
