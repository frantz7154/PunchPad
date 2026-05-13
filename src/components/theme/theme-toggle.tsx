"use client";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";

type Mode = "light" | "dark" | "system";

const STORAGE_KEY = "punchpad-theme";
const CHANGE_EVENT = "punchpad-theme-changed";

function apply(mode: Mode) {
  const isSystemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const actual = mode === "system" ? (isSystemDark ? "dark" : "light") : mode;
  document.documentElement.setAttribute("data-theme", actual);
  localStorage.setItem(STORAGE_KEY, mode);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(cb: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(CHANGE_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

function getSnapshot(): Mode {
  return (localStorage.getItem(STORAGE_KEY) as Mode | null) ?? "system";
}

function getServerSnapshot(): Mode {
  return "system";
}

export function ThemeToggle() {
  const mode = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const next: Mode = mode === "light" ? "dark" : mode === "dark" ? "system" : "light";
  const label = mode === "light" ? "Light" : mode === "dark" ? "Dark" : "System";

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      aria-label={`Theme: ${label}. Click to switch.`}
      data-testid="theme-toggle"
      data-theme-mode={mode}
      onClick={() => apply(next)}
    >
      {label}
    </Button>
  );
}
