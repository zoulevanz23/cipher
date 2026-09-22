import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AuthModal } from "./AuthModal";

describe("AuthModal", () => {
  it("should render register form by default", () => {
    render(<AuthModal onClose={vi.fn()} onAuth={vi.fn()} />);
    expect(screen.getByText("Create Account")).toBeInTheDocument();
  });

  it("should render login form when tab is login", () => {
    render(<AuthModal onClose={vi.fn()} onAuth={vi.fn()} initialTab="login" />);
    expect(screen.getByText("Sign In")).toBeInTheDocument();
  });
});
