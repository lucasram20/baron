"use client";

import { createContext, type ReactNode, useContext, useEffect, useSyncExternalStore } from "react";
import { flushSync } from "react-dom";

export type ThemePreference = "dark" | "light" | "system";
export type ResolvedTheme = "dark" | "light";

interface ThemeContextValue {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  setPreference: (next: ThemePreference, originEl?: HTMLElement | null) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  preference: "dark",
  resolved: "dark",
  setPreference: () => undefined,
});

const STORAGE_KEY = "baron-theme-preference";
const THEME_EVENT = "baron-theme-preference-change";

function subscribePreference(callback: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) callback();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(THEME_EVENT, callback);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(THEME_EVENT, callback);
  };
}

function getPreferenceSnapshot(): ThemePreference {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved === "light" || saved === "dark" || saved === "system" ? saved : "dark";
  } catch {
    return "dark";
  }
}

function subscribeSystemTheme(callback: () => void) {
  const mq = window.matchMedia("(prefers-color-scheme: light)");
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

function getSystemThemeSnapshot(): ResolvedTheme {
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function applyRootThemeClass(nextResolved: ResolvedTheme) {
  const root = document.documentElement;
  root.classList.remove("dark", "light");
  root.classList.add(nextResolved);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const preference = useSyncExternalStore<ThemePreference>(
    subscribePreference,
    getPreferenceSnapshot,
    () => "dark",
  );
  const systemTheme = useSyncExternalStore<ResolvedTheme>(
    subscribeSystemTheme,
    getSystemThemeSnapshot,
    () => "dark",
  );

  const resolved: ResolvedTheme = preference === "system" ? systemTheme : preference;

  useEffect(() => {
    applyRootThemeClass(resolved);
  }, [resolved]);

  const setPreference = (next: ThemePreference, originEl?: HTMLElement | null) => {
    if (typeof window === "undefined") return;
    const nextResolved: ResolvedTheme = next === "system" ? systemTheme : next;
    const commit = () => {
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // Ignore storage write failure in restricted webview contexts.
      }
      applyRootThemeClass(nextResolved);
      window.dispatchEvent(new Event(THEME_EVENT));
    };

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const canTransition =
      !reduceMotion &&
      nextResolved !== resolved &&
      typeof document.startViewTransition === "function" &&
      document.documentElement.dataset.magicuiThemeVt !== "active";

    if (!canTransition) {
      commit();
      return;
    }

    // MagicUI AnimatedThemeToggler percentage-scaled circular clip-path wipe
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let cx = vw / 2;
    let cy = vh / 2;
    if (originEl) {
      const rect = originEl.getBoundingClientRect();
      cx = rect.left + rect.width / 2;
      cy = rect.top + rect.height / 2;
    }
    const maxRadius = Math.hypot(Math.max(cx, vw - cx), Math.max(cy, vh - cy));
    const point = `${(cx / vw) * 100}% ${(cy / vh) * 100}%`;
    const radiusPct = `${(maxRadius / (Math.hypot(vw, vh) / Math.SQRT2)) * 100}%`;
    const clipPath = [`circle(0% at ${point})`, `circle(${radiusPct} at ${point})`];

    const root = document.documentElement;
    root.dataset.magicuiThemeVt = "active";
    root.style.setProperty("--magicui-theme-vt-clip-from", clipPath[0]);

    const cleanup = () => {
      delete root.dataset.magicuiThemeVt;
      root.style.removeProperty("--magicui-theme-vt-clip-from");
    };

    try {
      const transition = document.startViewTransition(() => {
        flushSync(commit);
      });
      transition?.finished?.finally(cleanup).catch(cleanup);
      transition?.ready
        ?.then(() => {
          document.documentElement.animate(
            { clipPath },
            {
              duration: 360,
              easing: "cubic-bezier(0.22, 1, 0.36, 1)",
              fill: "forwards",
              pseudoElement: "::view-transition-new(root)",
            },
          );
        })
        .catch(cleanup);
    } catch {
      cleanup();
      commit();
    }
  };

  return (
    <ThemeContext.Provider value={{ preference, resolved, setPreference }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
