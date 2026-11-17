"use client";

import { useEffect, useState } from "react";

export type VaultGridColumns = "2" | "3" | "4";

const STORAGE_KEY = "gv:vault-grid-columns";

function isVaultGridColumns(value: string | null): value is VaultGridColumns {
  return value === "2" || value === "3" || value === "4";
}

export function useVaultGridColumns() {
  const [columns, setColumns] = useState<VaultGridColumns>("2");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (isVaultGridColumns(saved)) setColumns(saved);
  }, []);

  const updateColumns = (value: VaultGridColumns) => {
    setColumns(value);
    localStorage.setItem(STORAGE_KEY, String(value));
  };

  return { columns, setColumns: updateColumns };
}
