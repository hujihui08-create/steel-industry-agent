import { useAuthStore } from "@/app/stores/authStore";

const AUTH_STORAGE_KEY = "auth-storage";

// Helper to directly inspect localStorage content as the store writes it
function getStoredAuthData() {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;
  return JSON.parse(raw);
}

beforeEach(() => {
  localStorage.clear();
  // Reset store state between tests by logging out
  const store = useAuthStore.getState();
  store.logout();
});

// ---------------------------------------------------------------------------
// 1. initialState
// ---------------------------------------------------------------------------
describe("initialState", () => {
  it("should have access_token=null, refresh_token=null, isAuthenticated=false, isHydrated=false", () => {
    const state = useAuthStore.getState();

    expect(state.access_token).toBeNull();
    expect(state.refresh_token).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isHydrated).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 2. setTokens()
// ---------------------------------------------------------------------------
describe("setTokens()", () => {
  it("should set tokens and isAuthenticated=true", () => {
    const store = useAuthStore.getState();
    store.setTokens("access-abc", "refresh-xyz");

    const state = useAuthStore.getState();
    expect(state.access_token).toBe("access-abc");
    expect(state.refresh_token).toBe("refresh-xyz");
    expect(state.isAuthenticated).toBe(true);
  });

  it("should persist tokens to localStorage in the correct structure", () => {
    const store = useAuthStore.getState();
    store.setTokens("access-abc", "refresh-xyz");

    const stored = getStoredAuthData();
    expect(stored).not.toBeNull();
    expect(stored.version).toBe(0);
    expect(stored.state.access_token).toBe("access-abc");
    expect(stored.state.refresh_token).toBe("refresh-xyz");
    expect(stored.state.isAuthenticated).toBe(true);
  });

  it("should not affect isHydrated", () => {
    // setTokens does not change isHydrated; it remains whatever it was
    const store = useAuthStore.getState();
    store.setTokens("access-abc", "refresh-xyz");

    const state = useAuthStore.getState();
    // isHydrated starts as false and setTokens does not touch it
    expect(state.isHydrated).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 3. logout()
// ---------------------------------------------------------------------------
describe("logout()", () => {
  it("should clear tokens and set isAuthenticated=false", () => {
    // First set tokens
    const store = useAuthStore.getState();
    store.setTokens("access-abc", "refresh-xyz");

    // Then logout
    const currentStore = useAuthStore.getState();
    currentStore.logout();

    const state = useAuthStore.getState();
    expect(state.access_token).toBeNull();
    expect(state.refresh_token).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it("should persist cleared state to localStorage", () => {
    // Set tokens first
    const store = useAuthStore.getState();
    store.setTokens("access-abc", "refresh-xyz");

    // Logout
    const currentStore = useAuthStore.getState();
    currentStore.logout();

    const stored = getStoredAuthData();
    expect(stored).not.toBeNull();
    expect(stored.state.access_token).toBeNull();
    expect(stored.state.refresh_token).toBeNull();
    expect(stored.state.isAuthenticated).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 4. hydrate() — restore from valid localStorage
// ---------------------------------------------------------------------------
describe("hydrate() — valid data", () => {
  it("should restore tokens from localStorage when valid data exists", () => {
    // Write valid auth data directly to localStorage
    const authData = {
      state: {
        access_token: "hydrate-access",
        refresh_token: "hydrate-refresh",
        isAuthenticated: true,
      },
      version: 0,
    };
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData));

    const store = useAuthStore.getState();
    store.hydrate();

    const state = useAuthStore.getState();
    expect(state.access_token).toBe("hydrate-access");
    expect(state.refresh_token).toBe("hydrate-refresh");
    expect(state.isAuthenticated).toBe(true);
    expect(state.isHydrated).toBe(true);
  });

  it("should NOT restore tokens when access_token is null", () => {
    const authData = {
      state: {
        access_token: null,
        refresh_token: "hydrate-refresh",
        isAuthenticated: false,
      },
      version: 0,
    };
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData));

    const store = useAuthStore.getState();
    store.hydrate();

    const state = useAuthStore.getState();
    expect(state.access_token).toBeNull();
    expect(state.refresh_token).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isHydrated).toBe(true); // still hydrated
  });

  it("should NOT restore tokens when refresh_token is null", () => {
    const authData = {
      state: {
        access_token: "hydrate-access",
        refresh_token: null,
        isAuthenticated: false,
      },
      version: 0,
    };
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData));

    const store = useAuthStore.getState();
    store.hydrate();

    const state = useAuthStore.getState();
    expect(state.access_token).toBeNull();
    expect(state.refresh_token).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isHydrated).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 5. hydrate() — no localStorage data
// ---------------------------------------------------------------------------
describe("hydrate() — no data", () => {
  it("should set isHydrated=true even when no data in localStorage", () => {
    // localStorage is empty (cleared in beforeEach + no data written)

    const store = useAuthStore.getState();
    store.hydrate();

    const state = useAuthStore.getState();
    expect(state.isHydrated).toBe(true);
    expect(state.access_token).toBeNull();
    expect(state.refresh_token).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 6. hydrate() — corrupted data
// ---------------------------------------------------------------------------
describe("hydrate() — corrupted data", () => {
  it("should handle corrupted localStorage data gracefully and set isHydrated=true", () => {
    localStorage.setItem(AUTH_STORAGE_KEY, "not-valid-json{{{");

    const store = useAuthStore.getState();
    store.hydrate();

    const state = useAuthStore.getState();
    expect(state.isHydrated).toBe(true);
    expect(state.access_token).toBeNull();
    expect(state.refresh_token).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it("should handle empty object in localStorage", () => {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({}));

    const store = useAuthStore.getState();
    store.hydrate();

    const state = useAuthStore.getState();
    expect(state.isHydrated).toBe(true);
    expect(state.access_token).toBeNull();
    expect(state.refresh_token).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it("should handle object missing state property", () => {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ version: 0 }));

    const store = useAuthStore.getState();
    store.hydrate();

    const state = useAuthStore.getState();
    expect(state.isHydrated).toBe(true);
    expect(state.access_token).toBeNull();
    expect(state.refresh_token).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 7. Multiple setTokens/logout cycles
// ---------------------------------------------------------------------------
describe("multiple cycles", () => {
  it("should correctly handle setTokens -> logout -> setTokens", () => {
    const storeA = useAuthStore.getState();
    storeA.setTokens("token-A", "refresh-A");
    expect(useAuthStore.getState().access_token).toBe("token-A");
    expect(useAuthStore.getState().isAuthenticated).toBe(true);

    const storeB = useAuthStore.getState();
    storeB.logout();
    expect(useAuthStore.getState().access_token).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);

    const storeC = useAuthStore.getState();
    storeC.setTokens("token-B", "refresh-B");
    expect(useAuthStore.getState().access_token).toBe("token-B");
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it("should correctly handle setTokens -> setTokens (overwrite)", () => {
    const store = useAuthStore.getState();
    store.setTokens("first", "first-refresh");

    const store2 = useAuthStore.getState();
    store2.setTokens("second", "second-refresh");

    const state = useAuthStore.getState();
    expect(state.access_token).toBe("second");
    expect(state.refresh_token).toBe("second-refresh");

    const stored = getStoredAuthData();
    expect(stored.state.access_token).toBe("second");
    expect(stored.state.refresh_token).toBe("second-refresh");
  });

  it("should correctly handle logout -> logout (idempotent)", () => {
    const store = useAuthStore.getState();
    store.logout();

    const store2 = useAuthStore.getState();
    store2.logout();

    const state = useAuthStore.getState();
    expect(state.access_token).toBeNull();
    expect(state.refresh_token).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it("should correctly handle setTokens -> hydrate (hydrate overwrites)", () => {
    const store = useAuthStore.getState();
    store.setTokens("from-set", "from-set-refresh");

    // Now write different data to localStorage
    const overrideData = {
      state: {
        access_token: "from-hydrate",
        refresh_token: "from-hydrate-refresh",
        isAuthenticated: true,
      },
      version: 0,
    };
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(overrideData));

    const store2 = useAuthStore.getState();
    store2.hydrate();

    const state = useAuthStore.getState();
    expect(state.access_token).toBe("from-hydrate");
    expect(state.refresh_token).toBe("from-hydrate-refresh");
    expect(state.isAuthenticated).toBe(true);
    expect(state.isHydrated).toBe(true);
  });
});
