"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type Mode = "light" | "dark" | "system";

function apply(mode: Mode) {
  const isSystemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const actual = mode === "system" ? (isSystemDark ? "dark" : "light") : mode;
  document.documentElement.setAttribute("data-theme", actual);
  localStorage.setItem("punchpad-theme", mode);
}

export function ThemeToggle() {
  const [mode, setMode] = useState<Mode>("dark");

  useEffect(() => {
    const stored = (localStorage.getItem("punchpad-theme") as Mode | null) ?? "system";
    setMode(stored);
  }, []);

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
      onClick={() => {
        setMode(next);
        apply(next);
      }}
    >
      {label}
    </Button>
  );
}
