import { describe, it, expect, beforeEach } from "vitest";
import { useLoginDialogStore } from "@/app/stores/loginDialogStore";

beforeEach(() => {
  // Reset to closed state
  useLoginDialogStore.setState({ open: false });
});

describe("loginDialogStore", () => {
  // =========================================================================
  // 1. Initial state
  // =========================================================================
  describe("initialState", () => {
    it("should have open=false", () => {
      const state = useLoginDialogStore.getState();
      expect(state.open).toBe(false);
    });
  });

  // =========================================================================
  // 2. openLoginDialog
  // =========================================================================
  describe("openLoginDialog()", () => {
    it("should set open=true", () => {
      useLoginDialogStore.getState().openLoginDialog();
      expect(useLoginDialogStore.getState().open).toBe(true);
    });

    it("should be idempotent (calling again keeps it open)", () => {
      const store = useLoginDialogStore.getState();
      store.openLoginDialog();
      store.openLoginDialog();

      expect(useLoginDialogStore.getState().open).toBe(true);
    });
  });

  // =========================================================================
  // 3. closeLoginDialog
  // =========================================================================
  describe("closeLoginDialog()", () => {
    it("should set open=false", () => {
      const store = useLoginDialogStore.getState();
      store.openLoginDialog();
      expect(useLoginDialogStore.getState().open).toBe(true);

      useLoginDialogStore.getState().closeLoginDialog();
      expect(useLoginDialogStore.getState().open).toBe(false);
    });

    it("should be idempotent (calling again keeps it closed)", () => {
      useLoginDialogStore.getState().closeLoginDialog();
      useLoginDialogStore.getState().closeLoginDialog();

      expect(useLoginDialogStore.getState().open).toBe(false);
    });
  });

  // =========================================================================
  // 4. Full cycle
  // =========================================================================
  describe("full cycle", () => {
    it("should handle open -> close -> open", () => {
      useLoginDialogStore.getState().openLoginDialog();
      expect(useLoginDialogStore.getState().open).toBe(true);

      useLoginDialogStore.getState().closeLoginDialog();
      expect(useLoginDialogStore.getState().open).toBe(false);

      useLoginDialogStore.getState().openLoginDialog();
      expect(useLoginDialogStore.getState().open).toBe(true);
    });
  });
});
