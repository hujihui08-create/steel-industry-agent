import { describe, it, expect, beforeEach } from "vitest";
import {
  setAdminToken,
  getAdminToken,
  removeAdminToken,
} from "@/app/utils/auth";
import { ADMIN_AUTH_STORAGE_KEY, AUTH_STORAGE_KEY } from "@/app/config";

beforeEach(() => {
  localStorage.clear();
});

describe("auth utils", () => {
  describe("setAdminToken", () => {
    it("should store token in localStorage under admin-auth-storage with correct structure", () => {
      setAdminToken("test-admin-token");

      const raw = localStorage.getItem(ADMIN_AUTH_STORAGE_KEY);
      expect(raw).not.toBeNull();

      const parsed = JSON.parse(raw!);
      expect(parsed.state.access_token).toBe("test-admin-token");
      expect(parsed.state.refresh_token).toBe("");
      expect(parsed.state.isAuthenticated).toBe(true);
      expect(parsed.version).toBe(0);
    });
  });

  describe("getAdminToken", () => {
    it("should return the access_token from admin-auth-storage", () => {
      const stored = {
        state: {
          access_token: "my-secret-token",
          refresh_token: "",
          isAuthenticated: true,
        },
        version: 0,
      };
      localStorage.setItem(ADMIN_AUTH_STORAGE_KEY, JSON.stringify(stored));

      const token = getAdminToken();
      expect(token).toBe("my-secret-token");
    });

    it("should return null when key does not exist", () => {
      const token = getAdminToken();
      expect(token).toBeNull();
    });

    it("should return null when JSON is malformed", () => {
      localStorage.setItem(ADMIN_AUTH_STORAGE_KEY, "not-valid-json{{{{");

      const token = getAdminToken();
      expect(token).toBeNull();
    });

    it("should return null when stored data has no state", () => {
      localStorage.setItem(
        ADMIN_AUTH_STORAGE_KEY,
        JSON.stringify({ version: 0 }),
      );

      const token = getAdminToken();
      expect(token).toBeNull();
    });

    it("should return null when access_token is missing from state", () => {
      localStorage.setItem(
        ADMIN_AUTH_STORAGE_KEY,
        JSON.stringify({
          state: { refresh_token: "rt", isAuthenticated: false },
          version: 0,
        }),
      );

      const token = getAdminToken();
      expect(token).toBeNull();
    });
  });

  describe("removeAdminToken", () => {
    it("should remove the admin-auth-storage key", () => {
      localStorage.setItem(ADMIN_AUTH_STORAGE_KEY, JSON.stringify({ token: "x" }));
      expect(localStorage.getItem(ADMIN_AUTH_STORAGE_KEY)).not.toBeNull();

      removeAdminToken();

      expect(localStorage.getItem(ADMIN_AUTH_STORAGE_KEY)).toBeNull();
    });

    it("should be safe to call when key does not exist", () => {
      expect(() => removeAdminToken()).not.toThrow();
      expect(localStorage.getItem(ADMIN_AUTH_STORAGE_KEY)).toBeNull();
    });
  });

  describe("token isolation", () => {
    it("setAdminToken should NOT affect auth-storage key", () => {
      localStorage.setItem(
        AUTH_STORAGE_KEY,
        JSON.stringify({
          state: {
            access_token: "user-token",
            refresh_token: "user-refresh",
            isAuthenticated: true,
          },
          version: 0,
        }),
      );

      setAdminToken("admin-token");

      const userRaw = localStorage.getItem(AUTH_STORAGE_KEY);
      const userParsed = JSON.parse(userRaw!);
      expect(userParsed.state.access_token).toBe("user-token");
      expect(userParsed.state.refresh_token).toBe("user-refresh");

      const adminRaw = localStorage.getItem(ADMIN_AUTH_STORAGE_KEY);
      const adminParsed = JSON.parse(adminRaw!);
      expect(adminParsed.state.access_token).toBe("admin-token");
    });

    it("removeAdminToken should NOT affect auth-storage key", () => {
      localStorage.setItem(
        AUTH_STORAGE_KEY,
        JSON.stringify({
          state: { access_token: "user-token", refresh_token: null, isAuthenticated: true },
          version: 0,
        }),
      );
      localStorage.setItem(ADMIN_AUTH_STORAGE_KEY, JSON.stringify({ token: "admin" }));

      removeAdminToken();

      expect(localStorage.getItem(ADMIN_AUTH_STORAGE_KEY)).toBeNull();
      expect(localStorage.getItem(AUTH_STORAGE_KEY)).not.toBeNull();

      const userParsed = JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY)!);
      expect(userParsed.state.access_token).toBe("user-token");
    });
  });
});
