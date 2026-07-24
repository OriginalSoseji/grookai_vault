"use client";

import {
  createContext,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
} from "react";
import type { BinderActionState } from "@/lib/binders/types";

const BinderIdempotencyContext = createContext<string | null>(null);

export function BinderIdempotencyScope({
  seed,
  children,
}: {
  seed: string;
  children: React.ReactNode;
}) {
  return (
    <BinderIdempotencyContext.Provider value={seed}>
      {children}
    </BinderIdempotencyContext.Provider>
  );
}
/**
 * The server supplies a fresh page-render seed and React supplies a stable
 * hydration-safe field id. A completed response advances the generation so a
 * later user intent gets a new key, while transport retries of the in-flight
 * form reuse the original key.
 */
export function BinderIdempotencyField({
  state,
}: {
  state: BinderActionState | null;
}) {
  const seed = useContext(BinderIdempotencyContext);
  const fieldId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const [generation, setGeneration] = useState(0);
  const key = useMemo(
    () => (seed ? `${seed}_${fieldId}_${generation}` : ""),
    [fieldId, generation, seed],
  );

  useEffect(() => {
    if (state) {
      setGeneration((value) => value + 1);
    }
  }, [state]);

  return <input type="hidden" name="idempotencyKey" value={key} />;
}
