"use client";

import { useEffect, useState } from "react";
import { MoonIcon, SunIcon } from "@/components/icons";

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const explicit = document.documentElement.dataset.theme;
    if (explicit === "dark") setIsDark(true);
    else if (explicit === "light") setIsDark(false);
    else setIsDark(window.matchMedia("(prefers-color-scheme: dark)").matches);
  }, []);

  async function toggle() {
    const next = isDark ? "light" : "dark";
    setIsDark(!isDark);
    document.documentElement.dataset.theme = next;
    await fetch("/api/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: next }),
    });
  }

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft hover:bg-paper hover:text-ink"
    >
      {isDark ? <SunIcon className="h-4.5 w-4.5" /> : <MoonIcon className="h-4.5 w-4.5" />}
    </button>
  );
}
