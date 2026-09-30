import { describe, it, expect } from "vitest";
import { normalizeEmail, validateConfirm, validateEmail, validatePassword } from "./validation";

/* Parity contract: every message here must stay byte-identical to
   vulnchecker/account.py::validate_email/validate_password.
   The backend test file asserts the same matrix server-side. */

describe("validateEmail", () => {
  it("accepts normal addresses", () => {
    expect(validateEmail("test@example.com")).toBeNull();
    expect(validateEmail("  TEST@Example.COM  ")).toBeNull();
  });
  it("rejects malformed addresses", () => {
    for (const bad of ["invalid", "test@", "@example.com", "a b@c.com", ""]) {
      expect(validateEmail(bad)).toBe("Enter a valid email");
    }
  });
  it("enforces the 254-char bound", () => {
    expect(validateEmail("a".repeat(242) + "@example.com")).toBeNull(); // 254
    expect(validateEmail("a".repeat(243) + "@example.com")).toBe("Enter a valid email"); // 255
  });
});

describe("validatePassword", () => {
  it("rejects short and long passwords", () => {
    expect(validatePassword("1234567")).toBe("Password must be at least 8 characters");
    expect(validatePassword("Ab1!a")).toBe("Password must be at least 8 characters");
    expect(validatePassword("x".repeat(129))).toBe("Password too long");
  });
  it("rejects the common-password blocklist (case-insensitive)", () => {
    for (const common of ["password", "PASSWORD", "Password", "12345678", "qwerty123", "QWERTY123"]) {
      expect(validatePassword(common)).toBe("Password too common");
    }
    expect(validatePassword("Password123456!")).toBe("Password too common");
    expect(validatePassword("Qwerty12345678!")).toBe("Password too common");
    expect(validatePassword("Welcome123!@#456")).toBe("Password too common");
    expect(validatePassword("letmein")).toBe("Password must be at least 8 characters");
  });
  it("rejects weak complexity, sequences and repeats", () => {
    expect(validatePassword("aaaValid!1234Xy")).toBe("Password must not contain 3 repeated characters");
    expect(validatePassword("Abcd1234!@#Xyz")).toBe("Password too weak — avoid sequences like abcd or 1234");
    expect(validatePassword("lowercaseonly123")).toBe("Password must include 3 of: uppercase, lowercase, number, symbol");
    expect(validatePassword("ALLUPPERCASE123")).toBe("Password must include 3 of: uppercase, lowercase, number, symbol");
    expect(validatePassword("johnMyS3cure#XyZ9", "john@example.com")).toBe("Password must not contain your email");
  });
  it("accepts boundary-valid passwords", () => {
    expect(validatePassword("Str0ng!P@ssw0rd#42")).toBeNull();
    expect(validatePassword("MyS3cure#Key2024!Xy")).toBeNull();
    expect(validatePassword("J7k!M9p#Q2v*X4nB$")).toBeNull();
  });
});

describe("normalizeEmail + validateConfirm", () => {
  it("trims and lowercases", () => {
    expect(normalizeEmail("  FOO@Bar.COM ")).toBe("foo@bar.com");
  });
  it("flags mismatched confirmation", () => {
    expect(validateConfirm("abc12345", "abc12346")).toBe("Passwords do not match");
    expect(validateConfirm("abc12345", "abc12345")).toBeNull();
  });
});
