import { createMemoryRouter, RouterProvider, Navigate } from "react-router-dom";
import { render, waitFor } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { useAuthStore } from "@/app/stores/authStore";
import { ROUTE } from "@/app/constants/auth";

// ---------------------------------------------------------------------------
// Replicate NotFoundRedirect — same logic as in src/app/router.tsx
// We avoid importing the real router because it uses createBrowserRouter
// + lazy-loaded pages which cause issues in the jsdom test environment.
// ---------------------------------------------------------------------------
function NotFoundRedirect() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return <Navigate to={isAuthenticated ? ROUTE.CHAT : ROUTE.SPLASH} replace />;
}

// ---------------------------------------------------------------------------
// Minimal route tree mirroring the relevant parts of the real router
// ---------------------------------------------------------------------------
const SPLASH_TEXT = "Splash Page";
const CHAT_TEXT = "Chat Page";
const ADMIN_TEXT = "Admin Page";

const testRoutes = [
  {
    path: ROUTE.SPLASH,
    element: <div>{SPLASH_TEXT}</div>,
  },
  {
    path: ROUTE.CHAT,
    element: <div>{CHAT_TEXT}</div>,
  },
  {
    path: `${ROUTE.ADMIN}/*`,
    element: <div>{ADMIN_TEXT}</div>,
  },
  {
    path: "*",
    element: <NotFoundRedirect />,
  },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("Router 404 redirects", () => {
  beforeEach(() => {
    // Reset the Zustand auth store to default (unauthenticated) state
    // before every test so tests are isolated.
    useAuthStore.setState({
      access_token: null,
      refresh_token: null,
      isAuthenticated: false,
      isHydrated: false,
    });
  });

  it("should redirect unauthenticated users from unknown route to /splash", async () => {
    useAuthStore.setState({ isAuthenticated: false });
    const testRouter = createMemoryRouter(testRoutes, {
      initialEntries: ["/xyzabc"],
    });
    render(<RouterProvider router={testRouter} />);

    await waitFor(() => {
      expect(testRouter.state.location.pathname).toBe(ROUTE.SPLASH);
    });
  });

  it("should redirect authenticated users from unknown route to /chat", async () => {
    useAuthStore.setState({ isAuthenticated: true });
    const testRouter = createMemoryRouter(testRoutes, {
      initialEntries: ["/nonexistent-page"],
    });
    render(<RouterProvider router={testRouter} />);

    await waitFor(() => {
      expect(testRouter.state.location.pathname).toBe(ROUTE.CHAT);
    });
  });

  it("should NOT redirect known admin sub-routes to the * catch-all", async () => {
    // admin/* is defined BEFORE * in the routes array. React Router v6
    // uses specificity-based matching, so /admin/agent/intents must match
    // the /admin/* route rather than the * catch-all.
    useAuthStore.setState({ isAuthenticated: false });
    const testRouter = createMemoryRouter(testRoutes, {
      initialEntries: ["/admin/agent/intents"],
    });
    render(<RouterProvider router={testRouter} />);

    await waitFor(() => {
      // The URL stays exactly as entered — no redirect to /splash or /chat.
      expect(testRouter.state.location.pathname).toBe("/admin/agent/intents");
    });
  });
});
