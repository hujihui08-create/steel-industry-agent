import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AuthGuard from "@/app/components/Auth/AuthGuard";
import { useAuthStore } from "@/app/stores/authStore";

// ---------------------------------------------------------------------------
// AuthGuard 组件测试
//
// AuthGuard 的行为：
// 1. isHydrated === false  → 返回 null（避免刷新闪烁）
// 2. isAuthenticated === false（且已 hydrated）→ <Navigate to="/login" replace />
// 3. isAuthenticated === true（且已 hydrated） → 渲染 children
// ---------------------------------------------------------------------------

beforeEach(() => {
  localStorage.clear();
  // 重置 store 到初始状态
  useAuthStore.setState({
    access_token: null,
    refresh_token: null,
    isAuthenticated: false,
    isHydrated: false,
  });
});

describe("AuthGuard", () => {
  // -----------------------------------------------------------------------
  // 测试 1：已认证 + 已水合 → 渲染受保护的子组件
  // -----------------------------------------------------------------------
  it("should render children when isAuthenticated=true and isHydrated=true", () => {
    useAuthStore.setState({
      access_token: "test-access-token",
      refresh_token: "test-refresh-token",
      isAuthenticated: true,
      isHydrated: true,
    });

    render(
      <MemoryRouter>
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      </MemoryRouter>,
    );

    expect(screen.getByText("Protected Content")).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // 测试 2：未认证 + 已水合 → 重定向到 /login，不渲染子组件
  // -----------------------------------------------------------------------
  it("should redirect to /login when isAuthenticated=false and isHydrated=true", () => {
    // 调用 hydrate() 模拟水合完成（localStorage 中无 token 时为未登录状态）
    useAuthStore.getState().hydrate();

    // hydrate 会将 isHydrated 设为 true，isAuthenticated 保持 false
    // verify: 此时 isHydrated=true, isAuthenticated=false
    const state = useAuthStore.getState();
    expect(state.isHydrated).toBe(true);
    expect(state.isAuthenticated).toBe(false);

    render(
      <MemoryRouter>
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      </MemoryRouter>,
    );

    // AuthGuard 会渲染 <Navigate to="/login" replace />，子内容不应存在
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // 测试 3：未水合 → 返回 null，不渲染任何内容
  // -----------------------------------------------------------------------
  it("should return null when isHydrated=false", () => {
    // beforeEach 已重置状态：isHydrated=false, isAuthenticated=false
    const state = useAuthStore.getState();
    expect(state.isHydrated).toBe(false);

    const { container } = render(
      <MemoryRouter>
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      </MemoryRouter>,
    );

    // 返回 null 意味着容器内没有任何内容
    expect(container.firstChild).toBeNull();
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
  });
});
