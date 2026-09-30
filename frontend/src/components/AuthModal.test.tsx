import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AuthModal } from "./AuthModal";
import { authLogin, authRegister, authGoogle } from "../api/client";

vi.mock("../api/client", () => ({
  ApiError: class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
  authLogin: vi.fn(),
  authRegister: vi.fn(),
  authGoogle: vi.fn(),
}));

const MockApiError = (await import("../api/client")).ApiError;

describe("AuthModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render register form by default", () => {
    render(<AuthModal onClose={vi.fn()} onAuth={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Create account" })).toBeInTheDocument();
    expect(screen.getByLabelText("Confirm password")).toBeInTheDocument();
  });

  it("should render login form when tab is login", () => {
    render(<AuthModal onClose={vi.fn()} onAuth={vi.fn()} initialTab="login" />);
    // Tab button and submit share the "Sign in" label — target the submit.
    expect(screen.getByTestId("auth-submit")).toHaveTextContent("Sign in");
    expect(screen.queryByLabelText("Confirm password")).not.toBeInTheDocument();
  });

  it("register submit routes to authRegister (not login)", async () => {
    const onAuth = vi.fn();
    const onClose = vi.fn();
    vi.mocked(authRegister).mockResolvedValueOnce({ token: "t", user_id: 1 });
    render(<AuthModal onClose={onClose} onAuth={onAuth} />);
    fireEvent.change(screen.getByPlaceholderText("you@example.com"), { target: { value: "new@example.com" } });
    const pws = screen.getAllByPlaceholderText("••••••••");
    fireEvent.change(pws[0], { target: { value: "Str0ng!P@ssw0rd#42" } });
    fireEvent.change(pws[1], { target: { value: "Str0ng!P@ssw0rd#42" } });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    await waitFor(() => expect(authRegister).toHaveBeenCalledWith("new@example.com", "Str0ng!P@ssw0rd#42"));
    expect(authLogin).not.toHaveBeenCalled();
    expect(onAuth).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("login submit routes to authLogin", async () => {
    vi.mocked(authLogin).mockResolvedValueOnce({ token: "t" });
    render(<AuthModal onClose={vi.fn()} onAuth={vi.fn()} initialTab="login" />);
    fireEvent.change(screen.getByPlaceholderText("you@example.com"), { target: { value: "me@example.com" } });
    fireEvent.change(screen.getByPlaceholderText("••••••••"), { target: { value: "Str0ng!P@ssw0rd#42" } });
    fireEvent.click(screen.getByTestId("auth-submit"));
    await waitFor(() => expect(authLogin).toHaveBeenCalledWith("me@example.com", "Str0ng!P@ssw0rd#42"));
    expect(authRegister).not.toHaveBeenCalled();
  });

  it("blocks submit on mismatched confirmation without calling the API", () => {
    render(<AuthModal onClose={vi.fn()} onAuth={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText("you@example.com"), { target: { value: "new@example.com" } });
    const pws = screen.getAllByPlaceholderText("••••••••");
    fireEvent.change(pws[0], { target: { value: "Str0ng!P@ssw0rd#42" } });
    fireEvent.change(pws[1], { target: { value: "Str0ng!P@ssw0rd#43" } });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
    expect(authRegister).not.toHaveBeenCalled();
  });

  it("blocks submit on short password without calling the API", () => {
    render(<AuthModal onClose={vi.fn()} onAuth={vi.fn()} initialTab="login" />);
    fireEvent.change(screen.getByPlaceholderText("you@example.com"), { target: { value: "me@example.com" } });
    fireEvent.change(screen.getByPlaceholderText("••••••••"), { target: { value: "short" } });
    fireEvent.click(screen.getByTestId("auth-submit"));
    expect(screen.getByText("Password must be at least 8 characters")).toBeInTheDocument();
    expect(authLogin).not.toHaveBeenCalled();
  });

  it("409 on register suggests switching to sign in", async () => {
    vi.mocked(authRegister).mockRejectedValueOnce(new MockApiError(409, "Email already registered"));
    render(<AuthModal onClose={vi.fn()} onAuth={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText("you@example.com"), { target: { value: "taken@example.com" } });
    const pws = screen.getAllByPlaceholderText("••••••••");
    fireEvent.change(pws[0], { target: { value: "Str0ng!P@ssw0rd#42" } });
    fireEvent.change(pws[1], { target: { value: "Str0ng!P@ssw0rd#42" } });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    await screen.findByText("Email already registered.");
    fireEvent.click(screen.getByRole("button", { name: /switch to sign in/i }));
    expect(screen.queryByLabelText("Confirm password")).not.toBeInTheDocument();
  });

  it("401 on login shows invalid-credentials message", async () => {
    vi.mocked(authLogin).mockRejectedValueOnce(new MockApiError(401, "Invalid email or password"));
    const onAuth = vi.fn();
    render(<AuthModal onClose={vi.fn()} onAuth={onAuth} initialTab="login" />);
    fireEvent.change(screen.getByPlaceholderText("you@example.com"), { target: { value: "me@example.com" } });
    fireEvent.change(screen.getByPlaceholderText("••••••••"), { target: { value: "wrongpassword1" } });
    fireEvent.click(screen.getByTestId("auth-submit"));
    await screen.findByText("Invalid email or password.");
    expect(onAuth).not.toHaveBeenCalled();
  });
});

describe("AuthModal Google sign-in", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    delete (window as any).google;
  });

  it("hides the Google section when no client id is configured", () => {
    vi.stubEnv("VITE_GOOGLE_CLIENT_ID", "");
    render(<AuthModal onClose={vi.fn()} onAuth={vi.fn()} />);
    expect(screen.queryByText("Loading Google sign-in…")).not.toBeInTheDocument();
  });

  it("renders the Google button and completes sign-in via credential", async () => {
    vi.stubEnv("VITE_GOOGLE_CLIENT_ID", "test-client-id.apps.googleusercontent.com");
    const renderButton = vi.fn();
    const initialize = vi.fn();
    (window as any).google = { accounts: { id: { initialize, renderButton } } };
    vi.mocked(authGoogle).mockResolvedValueOnce({ token: "t", user_id: 9, email: "g@example.com", is_new: true });
    const onAuth = vi.fn();
    const onClose = vi.fn();
    render(<AuthModal onClose={onClose} onAuth={onAuth} />);
    await waitFor(() => expect(renderButton).toHaveBeenCalled());
    expect(initialize).toHaveBeenCalledWith(expect.objectContaining({ client_id: "test-client-id.apps.googleusercontent.com", auto_select: false }));
    const callback = initialize.mock.calls[0][0].callback;
    await callback({ credential: "fake-google-credential" });
    await waitFor(() => expect(authGoogle).toHaveBeenCalledWith("fake-google-credential"));
    expect(onAuth).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});

