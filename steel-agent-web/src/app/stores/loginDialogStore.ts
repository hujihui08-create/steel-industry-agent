import { create } from "zustand";

interface LoginDialogState {
  open: boolean;
  openLoginDialog: () => void;
  closeLoginDialog: () => void;
}

export const useLoginDialogStore = create<LoginDialogState>((set) => ({
  open: false,

  openLoginDialog: () => set({ open: true }),

  closeLoginDialog: () => set({ open: false }),
}));
