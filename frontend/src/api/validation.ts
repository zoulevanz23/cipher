/* Client-side auth validation. These rules MIRROR the backend
   (vulnchecker/account.py::validate_email/validate_password) byte
   for byte — messages included — so the form rejects exactly what
   the server would reject, before a round trip. */

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const COMMON_PASSWORDS = new Set([
  "password", "12345678", "qwerty123", "letmein", "123456789", "1234567890",
  "1234567", "123123", "qwerty", "abc123", "password1", "123456", "12345",
  "admin", "welcome", "monkey", "dragon", "master", "sunshine", "princess",
  "football", "iloveyou", "trustno1", "000000", "111111", "qwertyuiop",
  "123qwe", "1qaz2wsx", "password123", "admin123", "letmein123", "welcome123",
  "p@ssw0rd", "passw0rd", "qwerty123456", "1password", "654321", "superman",
  "jesus", "ninja", "mustang", "starwars", "qazwsx", "michael",
  "shadow", "123123123", "baseball", "whatever", "photon123",
]);

function hasRepeatedChars(pw: string): boolean {
  return /(.)\1\1/.test(pw);
}

function hasSequentialChars(pw: string): boolean {
  const low = pw.toLowerCase();
  const seqAlpha = "abcdefghijklmnopqrstuvwxyz";
  const seqNum = "0123456789";
  const seqKey = "qwertyuiopasdfghjklzxcvbnm";
  for (let i = 0; i < low.length - 3; i++) {
    const chunk = low.slice(i, i + 4);
    if (seqAlpha.includes(chunk) || seqAlpha.split("").reverse().join("").includes(chunk)) return true;
    if (seqNum.includes(chunk) || seqNum.split("").reverse().join("").includes(chunk)) return true;
    if (seqKey.includes(chunk)) return true;
  }
  return false;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validateEmail(email: string): string | null {
  const em = normalizeEmail(email);
  if (!EMAIL_RE.test(em) || em.length > 254) return "Enter a valid email";
  return null;
}

export function validatePassword(password: string, email?: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters";
  if (password.length > 128) return "Password too long";
  const low = password.toLowerCase();
  if (COMMON_PASSWORDS.has(low)) return "Password too common";
  for (const common of COMMON_PASSWORDS) {
    if (common.length >= 6 && low.includes(common) && common.length / password.length > 0.6) return "Password too common";
  }
  if (email) {
    const local = email.split("@")[0]?.toLowerCase();
    if (local && local.length >= 3 && low.includes(local)) return "Password must not contain your email";
  }
  if (hasRepeatedChars(password)) return "Password must not contain 3 repeated characters";
  if (hasSequentialChars(password)) return "Password too weak — avoid sequences like abcd or 1234";
  let cats = 0;
  if (/[A-Z]/.test(password)) cats++;
  if (/[a-z]/.test(password)) cats++;
  if (/[0-9]/.test(password)) cats++;
  if (/[^A-Za-z0-9]/.test(password)) cats++;
  if (cats < 3) return "Password must include 3 of: uppercase, lowercase, number, symbol";
  return null;
}

export function validateConfirm(password: string, confirm: string): string | null {
  if (confirm !== password) return "Passwords do not match";
  return null;
}

export function passwordScore(password: string): number {
  // 0-4 for meter, not used for validation
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)) score++;
  if (password.length >= 20 && score >= 3) score++;
  return Math.min(4, score);
}
