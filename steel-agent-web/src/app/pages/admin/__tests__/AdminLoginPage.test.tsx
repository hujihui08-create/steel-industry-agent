import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

/* eslint-disable no-var */
var mockNavigateFn: ReturnType<typeof vi.fn>;
/* eslint-enable no-var */

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  mockNavigateFn = vi.fn();
  return { ...actual, useNavigate: () => mockNavigateFn };
});

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/app/api/admin-auth", () => ({
  adminLogin: vi.fn(),
}));

vi.mock("@/app/utils/auth", () => ({
  setAdminToken: vi.fn().mockImplementation((token: string) => {
    localStorage.setItem(
      "admin-auth-storage",
      JSON.stringify({
        state: {
          access_token: token,
          refresh_token: "",
          isAuthenticated: true,
        },
        version: 0,
      }),
    );
  }),
}));

import AdminLoginPage from "@/app/pages/admin/AdminLoginPage";
import { adminLogin } from "@/app/api/admin-auth";
import { setAdminToken } from "@/app/utils/auth";

const mockAdminLogin = adminLogin as ReturnType<typeof vi.fn>;
const mockSetAdminToken = setAdminToken as ReturnType<typeof vi.fn>;

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  mockAdminLogin.mockReset();
  mockNavigateFn.mockReset();
});

describe("AdminLoginPage", () => {
  it("should store token in admin-auth-storage localStorage key after successful login", async () => {
    mockAdminLogin.mockResolvedValue({ token: "admin-jwt-token" });

    render(
      <MemoryRouter>
        <AdminLoginPage />
      </MemoryRouter>,
    );

    const user = userEvent.setup();

    const usernameInput = screen.getByPlaceholderText("请输入管理员账号");
    const passwordInput = screen.getByPlaceholderText("请输入密码");
    const submitButton = screen.getByText("登录");

    await user.type(usernameInput, "admin");
    await user.type(passwordInput, "secure-password");
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockAdminLogin).toHaveBeenCalledWith("admin", "secure-password");
    });

    await waitFor(() => {
      expect(mockSetAdminToken).toHaveBeenCalledWith("admin-jwt-token");
    });

    const adminStorage = localStorage.getItem("admin-auth-storage");
    expect(adminStorage).not.toBeNull();

    const adminParsed = JSON.parse(adminStorage!);
    expect(adminParsed.state.access_token).toBe("admin-jwt-token");
    expect(adminParsed.state.isAuthenticated).toBe(true);
    expect(adminParsed.version).toBe(0);

    expect(localStorage.getItem("auth-storage")).toBeNull();
  });

  it("should navigate to /admin after successful login", async () => {
    mockAdminLogin.mockResolvedValue({ token: "admin-jwt-token" });

    render(
      <MemoryRouter>
        <AdminLoginPage />
      </MemoryRouter>,
    );

    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText("请输入管理员账号"), "admin");
    await user.type(screen.getByPlaceholderText("请输入密码"), "pass123");
    await user.click(screen.getByText("登录"));

    await waitFor(() => {
      expect(mockNavigateFn).toHaveBeenCalledWith("/admin", { replace: true });
    });
  });

  it("should display error when login fails", async () => {
    mockAdminLogin.mockRejectedValue(new Error("密码错误"));

    render(
      <MemoryRouter>
        <AdminLoginPage />
      </MemoryRouter>,
    );

    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText("请输入管理员账号"), "admin");
    await user.type(screen.getByPlaceholderText("请输入密码"), "wrong-password");
    await user.click(screen.getByText("登录"));

    await waitFor(() => {
      const errors = screen.getAllByText("密码错误");
      expect(errors.length).toBeGreaterThanOrEqual(1);
    });

    expect(mockSetAdminToken).not.toHaveBeenCalled();
    expect(mockNavigateFn).not.toHaveBeenCalled();
  });

  it("should show loading state on submit button while submitting", async () => {
    mockAdminLogin.mockImplementation(
      () => new Promise<{ token: string }>(() => {}),
    );

    render(
      <MemoryRouter>
        <AdminLoginPage />
      </MemoryRouter>,
    );

    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText("请输入管理员账号"), "admin");
    await user.type(screen.getByPlaceholderText("请输入密码"), "pass123");
    await user.click(screen.getByText("登录"));

    expect(await screen.findByText("登录中...")).toBeInTheDocument();
    expect(screen.queryByText("登录")).not.toBeInTheDocument();
  });
});
