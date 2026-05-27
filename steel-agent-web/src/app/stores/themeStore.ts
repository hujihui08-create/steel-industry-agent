import { create } from "zustand";

const STORAGE_KEY = "steel-theme";

export type Theme = "light" | "dark" | "system";

interface ThemeState {
  theme: Theme;

  /** Set theme and persist + apply. */
  setTheme: (theme: Theme) => void;
}

function applyThemeClass(theme: Theme): void {
  const root = document.documentElement;

  if (theme === "dark") {
    root.classList.add("dark");
  } else if (theme === "light") {
    root.classList.remove("dark");
  } else {
    // system — follow OS preference
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (prefersDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }
}

function readStoredTheme(): Theme {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === "light" || raw === "dark" || raw === "system") {
      return raw;
    }
  } catch {
    // ignore corrupt storage
  }
  return "system";
}

// Prevent duplicate listener registration (e.g. HMR)
let _systemListenerInstalled = false;

function setupSystemListener(): () => void {
  if (_systemListenerInstalled) return () => {};
  _systemListenerInstalled = true;

  const mql = window.matchMedia("(prefers-color-scheme: dark)");

  const handleChange = () => {
    const state = useThemeStore.getState();
    if (state.theme === "system") {
      applyThemeClass("system");
    }
  };

  mql.addEventListener("change", handleChange);

  return () => {
    _systemListenerInstalled = false;
    mql.removeEventListener("change", handleChange);
  };
}

export const cleanupSystemListener = setupSystemListener();

export const useThemeStore = create<ThemeState>((set) => ({
  theme: readStoredTheme(),

  setTheme: (theme: Theme) => {
    set({ theme });
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // ignore quota errors
    }
    applyThemeClass(theme);
  },
}));

// Apply initial theme on store creation
applyThemeClass(useThemeStore.getState().theme);
