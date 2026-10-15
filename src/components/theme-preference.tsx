"use client";

import { useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "@/components/icons";

type Theme = "system" | "light" | "dark";
let sessionOverride: Theme | undefined;
function snapshot(): Theme {
  if (sessionOverride) return sessionOverride;
  try {
    const saved = localStorage.getItem("academy-theme");
    return saved === "light" || saved === "dark" ? saved : "system";
  } catch { return "system"; }
}
function subscribe(listener: () => void) {
  function changed() {
    document.documentElement.dataset.theme = snapshot();
    listener();
  }
  function storageChanged(event: StorageEvent) {
    if (event.key !== null && event.key !== "academy-theme") return;
    sessionOverride = undefined;
    changed();
  }
  window.addEventListener("storage", storageChanged);
  window.addEventListener("academy:theme", changed);
  // A change made in another tab before this one hydrated emits no event we can observe.
  document.documentElement.dataset.theme = snapshot();
  return () => { window.removeEventListener("storage", storageChanged); window.removeEventListener("academy:theme", changed); };
}

const themeIcons = { system: Monitor, light: Sun, dark: Moon } as const;

export function ThemePreference() {
  const theme = useSyncExternalStore(subscribe, snapshot, () => "system" as Theme);
  const ThemeIcon = themeIcons[theme];
  return <label className="theme-preference"><ThemeIcon /><span className="sr-only">Color theme</span><select aria-label="Color theme" value={theme} onChange={(event) => {
    const next = event.target.value as Theme;
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("academy-theme", next); sessionOverride = undefined; } catch { sessionOverride = next; }
    window.dispatchEvent(new Event("academy:theme"));
  }}><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select></label>;
}
