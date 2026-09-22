import { describe, it, expect, vi, beforeEach } from "vitest";
import { authRegister, authLogin, authAnonymous, authMe, changePassword, deleteAccount, getToken, setToken, clearToken } from "./client";

describe("Auth API", () => {
  beforeEach(() => {
    clearToken();
    vi.clearAllMocks();
  });

  it("should store and retrieve token", () => {
    setToken("test-token");
    expect(getToken()).toBe("test-token");
  });

  it("should clear token", () => {
    setToken("test-token");
    clearToken();
    expect(getToken()).toBeNull();
  });
});
