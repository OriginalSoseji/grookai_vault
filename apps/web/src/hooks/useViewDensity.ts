"use client";

import { useEffect, useState } from "react";

export type ViewDensity = "compact" | "default" | "large";

const STORAGE_KEY = "gv:view-density";

function isViewDensity(value: string | null): value is ViewDensity {
  return value === "compact" || value === "default" || value === "large";
}

export function useViewDensity() {
  const [density, setDensity] = useState<ViewDensity>("default");

  useEffect(() => {
    const savedDensity = localStorage.getItem(STORAGE_KEY);
    if (isViewDensity(savedDensity)) {
      setDensity(savedDensity);
    }
  }, []);

  const updateDensity = (value: ViewDensity) => {
    setDensity(value);
    localStorage.setItem(STORAGE_KEY, value);
  };

  return { density, setDensity: updateDensity };
}
