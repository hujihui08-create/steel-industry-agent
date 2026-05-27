import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/app/utils/auth", () => ({
  getAdminToken: vi.fn(),
  removeAdminToken: vi.fn(),
}));

vi.mock("@/app/api/admin-auth", () => ({
  adminGetInfo: vi.fn(),
}));

import AdminAuthGuard from "@/app/components/Auth/AdminAuthGuard";
import { getAdminToken, removeAdminToken } from "@/app/utils/auth";
import { adminGetInfo } from "@/app/api/admin-auth";

const mockGetAdminToken = getAdminToken as ReturnType<typeof vi.fn>;
const mockRemoveAdminToken = removeAdminToken as ReturnType<typeof vi.fn>;
const mockAdminGetInfo = adminGetInfo as ReturnType<typeof vi.fn>;

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  mockGetAdminToken.mockReturnValue(null);
  mockAdminGetInfo.mockReset();
});

describe("AdminAuthGuard", () => {
  it("should redirect to /admin/login and not render children when no token", async () => {
    mockGetAdminToken.mockReturnValue(null);

    render(
      <MemoryRouter>
        <AdminAuthGuard>
          <div>Admin Dashboard</div>
        </AdminAuthGuard>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.queryByText("Admin Dashboard")).not.toBeInTheDocument();
    });
    expect(mockAdminGetInfo).not.toHaveBeenCalled();
  });

  it("should render children when token exists and adminGetInfo succeeds", async () => {
    mockGetAdminToken.mockReturnValue("valid-admin-token");
    mockAdminGetInfo.mockResolvedValue({
      id: 1,
      username: "admin",
      nickname: "Administrator",
      role: "super_admin",
      status: "active",
      lastLoginAt: "2024-01-01T00:00:00Z",
      createdAt: "2024-01-01T00:00:00Z",
    });

    render(
      <MemoryRouter>
        <AdminAuthGuard>
          <div>Admin Dashboard</div>
        </AdminAuthGuard>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Admin Dashboard")).toBeInTheDocument();
    });
    expect(mockAdminGetInfo).toHaveBeenCalledTimes(1);
    expect(mockRemoveAdminToken).not.toHaveBeenCalled();
  });

  it("should remove token and redirect to /admin/login when adminGetInfo fails", async () => {
    mockGetAdminToken.mockReturnValue("expired-admin-token");
    mockAdminGetInfo.mockRejectedValue(new Error("Unauthorized"));

    render(
      <MemoryRouter>
        <AdminAuthGuard>
          <div>Admin Dashboard</div>
        </AdminAuthGuard>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(mockRemoveAdminToken).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(screen.queryByText("Admin Dashboard")).not.toBeInTheDocument();
    });
  });

  it("should redirect to /admin/login when getAdminToken returns null", async () => {
    mockGetAdminToken.mockReturnValue(null);

    render(
      <MemoryRouter>
        <AdminAuthGuard>
          <div>Admin Dashboard</div>
        </AdminAuthGuard>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.queryByText("Admin Dashboard")).not.toBeInTheDocument();
    });
    expect(mockAdminGetInfo).not.toHaveBeenCalled();
  });
});
