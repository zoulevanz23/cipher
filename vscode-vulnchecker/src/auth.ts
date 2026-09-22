import * as vscode from "vscode";

const SECRET_KEY = "vulnchecker_token";
const USER_ID_KEY = "vulnchecker_user_id";
const CREDITS_KEY = "vulnchecker_credits";
const IS_ANON_KEY = "vulnchecker_is_anonymous";
const CREDITS_LIMIT = 5;

export interface AuthState {
  token: string | undefined;
  userId: number | undefined;
  email: string | undefined;
  isAnonymous: boolean;
  creditsRemaining: number;
}

export async function getAuthState(context: vscode.ExtensionContext): Promise<AuthState> {
  const token = await context.secrets.get(SECRET_KEY);
  const userId = context.globalState.get<number>(USER_ID_KEY);
  const credits = context.globalState.get<number>(CREDITS_KEY, 0);
  const isAnonymous = context.globalState.get<boolean>(IS_ANON_KEY, true);

  if (token && userId) {
    const user = await fetchUserProfile(context, token);
    if (user) {
      return { token, userId: user.id, email: user.email, isAnonymous: false, creditsRemaining: user.credits };
    }
  }

  return { token, userId, email: undefined, creditsRemaining: credits, isAnonymous };
}

export async function register(context: vscode.ExtensionContext, email: string, password: string): Promise<{ success: boolean; error?: string }> {
  const serverUrl = getServerUrl(context);
  try {
    const body = JSON.stringify({ email, password });
    const resp = await fetch(`${serverUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    const data = await resp.json();
    if (!resp.ok) {
      return { success: false, error: data.detail || "Registration failed" };
    }
    await saveAuth(context, data.token, data.user_id, data.email, false, 0);
    return { success: true };
  } catch {
    return { success: false, error: "Failed to connect to server" };
  }
}

export async function login(context: vscode.ExtensionContext, email: string, password: string): Promise<{ success: boolean; error?: string }> {
  const serverUrl = getServerUrl(context);
  try {
    const body = JSON.stringify({ email, password });
    const resp = await fetch(`${serverUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    const data = await resp.json();
    if (!resp.ok) {
      return { success: false, error: data.detail || "Login failed" };
    }
    await saveAuth(context, data.token, data.user_id, data.email, false, 0);
    return { success: true };
  } catch {
    return { success: false, error: "Failed to connect to server" };
  }
}

export async function anonymousLogin(context: vscode.ExtensionContext): Promise<{ success: boolean; error?: string }> {
  const serverUrl = getServerUrl(context);
  try {
    const resp = await fetch(`${serverUrl}/api/auth/anonymous`, { method: "POST" });
    const data = await resp.json();
    if (!resp.ok) {
      return { success: false, error: data.detail || "Anonymous login failed" };
    }
    await saveAuth(context, data.token, data.user_id, undefined, true, data.credits || CREDITS_LIMIT);
    return { success: true };
  } catch {
    return { success: false, error: "Failed to connect to server" };
  }
}

export async function logout(context: vscode.ExtensionContext): Promise<void> {
  await context.secrets.delete(SECRET_KEY);
  await context.globalState.update(USER_ID_KEY, undefined);
  await context.globalState.update(CREDITS_KEY, 0);
  await context.globalState.update(IS_ANON_KEY, true);
}

export async function checkCredits(context: vscode.ExtensionContext): Promise<{ credits: number; limit: number }> {
  const state = await getAuthState(context);
  const serverUrl = getServerUrl(context);

  if (!state.isAnonymous && state.token) {
    try {
      const resp = await fetch(`${serverUrl}/api/auth/credits`, {
        headers: { Authorization: `Bearer ${state.token}` },
      });
      if (resp.ok) {
        const data = await resp.json();
        return { credits: data.credits, limit: data.is_authenticated ? Infinity : CREDITS_LIMIT };
      }
    } catch {}
  }

  return { credits: state.creditsRemaining, limit: state.isAnonymous ? CREDITS_LIMIT : Infinity };
}

export function getServerUrl(context: vscode.ExtensionContext): string {
  const config = vscode.workspace.getConfiguration("vulnchecker");
  return config.get<string>("serverUrl", "http://localhost:8000");
}

async function fetchUserProfile(context: vscode.ExtensionContext, token: string): Promise<{ id: number; email: string; credits: number } | null> {
  const serverUrl = getServerUrl(context);
  try {
    const resp = await fetch(`${serverUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!resp.ok) return null;
    return await resp.json();
  } catch {
    return null;
  }
}

async function saveAuth(context: vscode.ExtensionContext, token: string, userId: number, email: string | undefined, isAnonymous: boolean, credits: number): Promise<void> {
  await context.secrets.store(SECRET_KEY, token);
  await context.globalState.update(USER_ID_KEY, userId);
  await context.globalState.update(IS_ANON_KEY, isAnonymous);
  await context.globalState.update(CREDITS_KEY, credits);
  if (email) {
    await context.globalState.update("vulnchecker_email", email);
  }
}

export async function getAuthHeader(context: vscode.ExtensionContext): Promise<string | undefined> {
  const state = await getAuthState(context);
  return state.token ? `Bearer ${state.token}` : undefined;
}

export async function showAccountPrompt(context: vscode.ExtensionContext): Promise<void> {
  const result = await vscode.window.showWarningMessage(
    "VulnChecker: Scan limit reached. Create an account for unlimited scans.",
    "Create Account",
    "Sign In",
    "Later"
  );

  if (result === "Create Account") {
    await showRegisterFlow(context);
  } else if (result === "Sign In") {
    await showLoginFlow(context);
  }
}

async function showRegisterFlow(context: vscode.ExtensionContext): Promise<void> {
  const email = await vscode.window.showInputBox({
    prompt: "Enter your email",
    placeHolder: "you@example.com",
    validateInput: (v) => v.includes("@") && v.length > 3 ? undefined : "Enter a valid email",
  });
  if (!email) return;

  const password = await vscode.window.showInputBox({
    prompt: "Create a password",
    placeHolder: "At least 8 characters",
    password: true,
    validateInput: (v) => v.length >= 8 ? undefined : "Password must be at least 8 characters",
  });
  if (!password) return;

  const result = await register(context, email, password);
  if (result.success) {
    vscode.window.showInformationMessage("Account created! You now have unlimited scans.");
  } else {
    vscode.window.showErrorMessage(`Registration failed: ${result.error}`);
    showAccountPrompt(context);
  }
}

async function showLoginFlow(context: vscode.ExtensionContext): Promise<void> {
  const email = await vscode.window.showInputBox({
    prompt: "Enter your email",
    placeHolder: "you@example.com",
    validateInput: (v) => v.includes("@") && v.length > 3 ? undefined : "Enter a valid email",
  });
  if (!email) return;

  const password = await vscode.window.showInputBox({
    prompt: "Enter your password",
    placeHolder: "Your password",
    password: true,
  });
  if (!password) return;

  const result = await login(context, email, password);
  if (result.success) {
    vscode.window.showInformationMessage("Signed in! Unlimited scans enabled.");
  } else {
    vscode.window.showErrorMessage(`Login failed: ${result.error}`);
  }
}
