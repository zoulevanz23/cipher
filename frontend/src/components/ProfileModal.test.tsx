import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProfileModal } from "./ProfileModal";
import { authMe } from "../api/client";

vi.mock("../api/client", () => ({
  authMe: vi.fn(),
  changePassword: vi.fn(),
  deleteAccount: vi.fn(),
}));

const REGISTERED = {
  user_id: 1,
  email: "me@example.com",
  is_anonymous: false,
  created_at: "2026-01-15T10:00:00+00:00",
  credits: { credits: 0, reset_in_hours: 0 },
  stats: { scan_count: 7, total_vulnerabilities: 3 },
};

const ANON = {
  user_id: 2,
  email: "anon_1234",
  is_anonymous: true,
  created_at: "2026-09-20T10:00:00+00:00",
  credits: { credits: 3, reset_in_hours: 2.5 },
  stats: { scan_count: 2, total_vulnerabilities: 1 },
};

describe("ProfileModal account facts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders real registered-account facts", async () => {
    vi.mocked(authMe).mockResolvedValueOnce(REGISTERED);
    render(<ProfileModal email="me@example.com" onClose={vi.fn()} onDeleted={vi.fn()} />);
    await screen.findByText("Registered");
    expect(screen.getByText("2026-01-15")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("∞ unlimited")).toBeInTheDocument();
  });

  it("renders real anonymous credits instead of unlimited", async () => {
    vi.mocked(authMe).mockResolvedValueOnce(ANON);
    render(<ProfileModal email="anon_1234" onClose={vi.fn()} onDeleted={vi.fn()} />);
    await screen.findByText("Anonymous");
    expect(screen.getByText("3/23")).toBeInTheDocument();
    expect(screen.queryByText("∞ unlimited")).not.toBeInTheDocument();
  });

  it("shows an error when account facts fail to load", async () => {
    vi.mocked(authMe).mockRejectedValueOnce(new Error("offline"));
    render(<ProfileModal email="me@example.com" onClose={vi.fn()} onDeleted={vi.fn()} />);
    await screen.findByText("Could not load account details.");
  });
});
