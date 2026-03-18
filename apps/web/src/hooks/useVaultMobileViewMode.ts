"use client";

import { useEffect, useState } from "react";

export type VaultMobileViewMode = "grid" | "detail" | "compact";

const STORAGE_KEY = "gv:vault-mobile-view-mode";

function isVaultMobileViewMode(value: string | null): value is VaultMobileViewMode {
  return value === "grid" || value === "detail" || value === "compact";
}

export function useVaultMobileViewMode() {
  const [mode, setMode] = useState<VaultMobileViewMode>("grid");

  useEffect(() => {
    const savedMode = localStorage.getItem(STORAGE_KEY);
    if (isVaultMobileViewMode(savedMode)) {
      setMode(savedMode);
    }
  }, []);

  const updateMode = (value: VaultMobileViewMode) => {
    setMode(value);
    localStorage.setItem(STORAGE_KEY, value);
  };

  return { mode, setMode: updateMode };
}
