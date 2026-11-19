"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useSyncExternalStore,
} from "react";
import { flushSync } from "react-dom";
import { isTauriRuntime } from "@/lib/tauri";

export type ThemePreference = "dark" | "light" | "system";
export type ResolvedTheme = "dark" | "light";

interface ThemeContextValue {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  osTheme: ResolvedTheme;
  setPreference: (next: ThemePreference, originEl?: HTMLElement | null) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  preference: "dark",
  resolved: "dark",
  osTheme: "dark",
  setPreference: () => undefined,
});

const STORAGE_KEY = "baron-theme-preference";
const THEME_EVENT = "baron-theme-preference-change";

let cachedOsTheme: ResolvedTheme | null = null;
const osThemeListeners = new Set<() => void>();

function normalizeResolvedTheme(raw: unknown): ResolvedTheme {
  return typeof raw === "string" && raw.trim().toLowerCase() === "light" ? "light" : "dark";
}

function readMediaTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function getOsThemeSnapshot(): ResolvedTheme {
  if (cachedOsTheme !== null) return cachedOsTheme;
  return readMediaTheme();
}

function setOsThemeValue(next: ResolvedTheme) {
  if (cachedOsTheme === next) return;
  cachedOsTheme = next;
  for (const listener of osThemeListeners) {
    listener();
  }
}

function subscribeOsTheme(callback: () => void) {
  osThemeListeners.add(callback);
  const mq = window.matchMedia("(prefers-color-scheme: light)");
  const onMediaChange = () => {
    // In Tauri desktop, WebView2's prefers-color-scheme reflects setTheme overrides;
    // native OS theme comes authoritatively from Rust get_os_theme / baron://os-theme-changed.
    if (!isTauriRuntime()) {
      setOsThemeValue(mq.matches ? "light" : "dark");
    }
  };
  mq.addEventListener("change", onMediaChange);
  return () => {
    osThemeListeners.delete(callback);
    mq.removeEventListener("change", onMediaChange);
  };
}

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
  const osTheme = useSyncExternalStore<ResolvedTheme>(
    subscribeOsTheme,
    getOsThemeSnapshot,
    () => "dark",
  );
  const transitionEpochRef = useRef(0);

  const resolved: ResolvedTheme = preference === "system" ? osTheme : preference;

  useEffect(() => {
    applyRootThemeClass(resolved);
  }, [resolved]);

  // Sync authoritative native OS theme and Tauri WebView2 window theme.
  useEffect(() => {
    if (!isTauriRuntime()) return;
    let cancelled = false;
    let unlistenOsEvent: (() => void) | undefined;

    const syncNativeOsTheme = async () => {
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        const detected = await invoke<string>("get_os_theme");
        if (!cancelled) {
          setOsThemeValue(normalizeResolvedTheme(detected));
        }
      } catch {
        // Keep existing OS theme fallback if IPC is unavailable.
      }
    };

    const initTauriTheme = async () => {
      try {
        const [{ invoke }, { listen }] = await Promise.all([
          import("@tauri-apps/api/core"),
          import("@tauri-apps/api/event"),
        ]);
        const currentPref = getPreferenceSnapshot();
        const applied = await invoke<string>("set_app_theme", { mode: currentPref });
        if (!cancelled && currentPref === "system") {
          setOsThemeValue(normalizeResolvedTheme(applied));
        } else {
          await syncNativeOsTheme();
        }
        unlistenOsEvent = await listen<string>("baron://os-theme-changed", (event) => {
          if (!cancelled) {
            setOsThemeValue(normalizeResolvedTheme(event.payload));
          }
        });
      } catch {
        // Ignore event subscription errors in non-desktop environments.
      }
    };

    void initTauriTheme();
    const onFocus = () => {
      void syncNativeOsTheme();
    };
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
      unlistenOsEvent?.();
    };
  }, []);

  const commitPreferenceWithTransition = useCallback(
    (
      next: ThemePreference,
      targetOsTheme: ResolvedTheme,
      prevResolved: ResolvedTheme,
      originEl?: HTMLElement | null,
    ) => {
      const nextResolved: ResolvedTheme = next === "system" ? targetOsTheme : next;
      const commit = () => {
        try {
          window.localStorage.setItem(STORAGE_KEY, next);
        } catch {
          // Ignore storage write failure in restricted webview contexts.
        }
        setOsThemeValue(targetOsTheme);
        applyRootThemeClass(nextResolved);
        window.dispatchEvent(new Event(THEME_EVENT));
      };

      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const canTransition =
        !reduceMotion &&
        nextResolved !== prevResolved &&
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
    },
    [],
  );

  const setPreference = useCallback(
    (next: ThemePreference, originEl?: HTMLElement | null) => {
      if (typeof window === "undefined") return;
      const epoch = ++transitionEpochRef.current;
      const prevResolved = resolved;

      if (isTauriRuntime()) {
        if (next === "system") {
          void import("@tauri-apps/api/core")
            .then(({ invoke }) => invoke<string>("set_app_theme", { mode: "system" }))
            .then((detected) => {
              if (epoch !== transitionEpochRef.current) return;
              const liveOs = normalizeResolvedTheme(detected);
              commitPreferenceWithTransition("system", liveOs, prevResolved, originEl);
            })
            .catch(() => {
              if (epoch !== transitionEpochRef.current) return;
              commitPreferenceWithTransition("system", getOsThemeSnapshot(), prevResolved, originEl);
            });
          return;
        }

        // Explicit dark/light: animate immediately and sync native window theme in parallel.
        commitPreferenceWithTransition(next, getOsThemeSnapshot(), prevResolved, originEl);
        void import("@tauri-apps/api/core")
          .then(({ invoke }) => invoke<string>("set_app_theme", { mode: next }))
          .catch(() => {});
        return;
      }

      const browserOs = readMediaTheme();
      commitPreferenceWithTransition(next, browserOs, prevResolved, originEl);
    },
    [resolved, commitPreferenceWithTransition],
  );

  return (
    <ThemeContext.Provider value={{ preference, resolved, osTheme, setPreference }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
