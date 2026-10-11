"use client";

import { useEffect, useState } from "react";

export type VaultMobileViewMode = "grid" | "detail" | "compact";

const STORAGE_KEY = "gv:vault-mobile-view-mode";

function isVaultMobileViewMode(value: string | null): value is VaultMobileViewMode {
  return value === "grid" || value === "detail" || value === "compact";
}

export function useVaultMobileViewMode() {
  const [mode, setMode] = useState<VaultMobileViewMode>("compact");

  useEffect(() => {
    try {
      const savedMode = localStorage.getItem(STORAGE_KEY);
      if (isVaultMobileViewMode(savedMode)) setMode(savedMode);
    } catch { /* Browsing remains available when device storage is disabled. */ }
  }, []);

  const updateMode = (value: VaultMobileViewMode) => {
    setMode(value);
    try { localStorage.setItem(STORAGE_KEY, value); } catch { /* Keep this session's choice. */ }
  };

  return { mode, setMode: updateMode };
}
