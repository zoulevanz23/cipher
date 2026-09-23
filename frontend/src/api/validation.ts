/* Client-side auth validation. These rules MIRROR the backend
   (vulnchecker/account.py::validate_email/validate_password) byte
   for byte — messages included — so the form rejects exactly what
   the server would reject, before a round trip. */

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const COMMON_PASSWORDS = new Set(["password", "12345678", "qwerty123", "letmein"]);

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validateEmail(email: string): string | null {
  const em = normalizeEmail(email);
  if (!EMAIL_RE.test(em) || em.length > 254) return "Enter a valid email";
  return null;
}

export function validatePassword(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters";
  if (password.length > 128) return "Password too long";
  if (COMMON_PASSWORDS.has(password.toLowerCase())) return "Password too common";
  return null;
}

export function validateConfirm(password: string, confirm: string): string | null {
  if (confirm !== password) return "Passwords do not match";
  return null;
}
