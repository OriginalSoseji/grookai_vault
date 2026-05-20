"use client";

import { useEffect, useState } from "react";

type ThemeMode = "light" | "dark";

const STORAGE_KEY = "grookai-theme";

function getStoredTheme(): ThemeMode | null {
  if (typeof window === "undefined") return null;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "dark" || stored === "light" ? stored : null;
}

function getPreferredTheme(): ThemeMode {
  if (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-color-scheme: dark)").matches
  ) {
    return "dark";
  }

  return "light";
}

function applyTheme(theme: ThemeMode) {
  document.documentElement.classList.toggle("gv-dark", theme === "dark");
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeMode>("light");

  useEffect(() => {
    const initialTheme = getStoredTheme() ?? getPreferredTheme();
    setTheme(initialTheme);
    applyTheme(initialTheme);
  }, []);

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    window.localStorage.setItem(STORAGE_KEY, nextTheme);
    applyTheme(nextTheme);
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      aria-label={isDark ? "Use light mode" : "Use dark mode"}
      aria-pressed={isDark}
      onClick={toggleTheme}
      className="gv-theme-toggle inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition-all duration-100 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950"
    >
      {isDark ? (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4.25" />
          <path d="M12 2.75v2" />
          <path d="M12 19.25v2" />
          <path d="m4.46 4.46 1.42 1.42" />
          <path d="m18.12 18.12 1.42 1.42" />
          <path d="M2.75 12h2" />
          <path d="M19.25 12h2" />
          <path d="m4.46 19.54 1.42-1.42" />
          <path d="m18.12 5.88 1.42-1.42" />
        </svg>
      ) : (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.25 14.35A7.75 7.75 0 0 1 9.65 3.75 8.35 8.35 0 1 0 20.25 14.35Z" />
        </svg>
      )}
    </button>
  );
}
