"use client";
import { useEffect, useRef, useState } from "react";
import type { CatalogChoice } from "@/lib/stores/storeInventoryInput";
export type SuggestedScanCard = CatalogChoice & { rotation?: number };
export type ScanSuggestion = { status: string; cards: SuggestedScanCard[]; message?: string };

export function useScanSuggestions(key: string, preview: Blob | undefined, enabled: boolean) {
  const cache = useRef(new Map<string, ScanSuggestion>());
  const [state, setState] = useState<{ key: string; result: ScanSuggestion; pending: boolean }>({ key: "", result: { status: "idle", cards: [] }, pending: false });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!enabled || !key || !preview) return;
    const prior = cache.current.get(key);
    if (prior) { setState({ key, result: prior, pending: false }); return; }
    const controller = new AbortController();
    let active = true;
    setState({ key, result: { status: "matching", cards: [] }, pending: true });
    // The expanded worker may use 30 seconds; leave room for upload/readback.
    const timeout = setTimeout(() => controller.abort(), 40_000);
    fetch("/api/stores/owner/intake/match", { method: "POST", credentials: "same-origin", cache: "no-store", headers: { "Content-Type": preview.type }, body: preview, signal: controller.signal })
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Matching is unavailable. Use catalog search or retry.");
        const result = data as ScanSuggestion;
        if (!Array.isArray(result.cards)) throw new Error("Invalid match response.");
        if (result.cards.some(card => card.rotation !== undefined && ![0, 90, 180, 270].includes(card.rotation))) throw new Error("Invalid scan orientation.");
        if (!active) return;
        cache.current.set(key, result);
        setState({ key, result, pending: false });
      }).catch(error => {
        if (active) setState({ key, result: { status: "error", cards: [], message: error.name === "AbortError" ? "Matching timed out. Search the catalog or try again." : error.message }, pending: false });
      }).finally(() => clearTimeout(timeout));
    return () => { active = false; controller.abort(); clearTimeout(timeout); };
  }, [key, preview, enabled, retry]);
  return { ...(state.key === key && enabled ? state : { pending: false, result: { status: "idle", cards: [] } as ScanSuggestion }), retry: () => { cache.current.delete(key); setRetry(n => n + 1); } };
}
