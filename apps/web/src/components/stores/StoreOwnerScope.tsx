"use client";
import Link from "next/link";
import { teamWrite } from "./storeTeamWorkflowClient";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabaseClient";
import { createStoreOwnerClient } from "@/lib/stores/storeOwnerClient";
import type { OwnerProduct, ProductList } from "./storeManagerClient";

function ownerApi(client: ReturnType<typeof createStoreOwnerClient>) {
  const storeRequest = client.request;
  return { ...client, storeRequest,
    teamWrite: <T,>(url: string, body: Record<string, unknown>) => teamWrite<T>(url, body, client.ownerFetch, client.ready),
    ownerChange: (body: Record<string, unknown>) => storeRequest("/api/stores/owner", body),
    async productChange(product: OwnerProduct | null, action: string, data: Record<string, unknown> = {}) {
      const result = await storeRequest<ProductList>("/api/stores/owner/products", { id: product?.id ?? null, version: product?.version ?? null, action, data });
      if (!result.products[0]) throw new Error("Product could not be read back. Reload before editing.");
      return result.products[0];
    },
    async uploadStoreImage(file: File, kind: string, product?: string) {
      if (file.size > 5 * 1024 * 1024 || file.size === 0) throw new Error("Choose an image up to 5 MB");
      const data = new FormData(); data.set("file", file); data.set("kind", kind);
      if (product) data.set("product", product);
      return (await storeRequest<{ path: string }>("/api/stores/owner/media", data)).path;
    },
  };
}
const StoreOwnerContext = createContext<ReturnType<typeof ownerApi> | null>(null);
export function useStoreOwnerApi() {
  const value = useContext(StoreOwnerContext);
  if (!value) throw new Error("Private store actions require an owner scope");
  return value;
}
type ScopeProps = { ownerId: string; children: ReactNode; family?: "owner" | "team"; reopenHref?: string };
export function StoreOwnerScope(props: ScopeProps) {
  return <StoreOwnerSession key={`${props.ownerId}:${props.family ?? "owner"}:${props.reopenHref ?? "/account/store"}`} {...props} />;
}
function StoreOwnerSession({ ownerId, children, family = "owner", reopenHref = "/account/store" }: ScopeProps) {
  const [state, setState] = useState<{ api: ReturnType<typeof ownerApi> | null; closed: boolean }>({ api: null, closed: false });
  useEffect(() => {
    let mounted = true;
    const client = createStoreOwnerClient(ownerId, supabase.auth, fetch, () => {
      if (mounted) setState({ api: null, closed: true });
    }, family);
    void client.ready().then(() => {
      if (mounted && client.current()) setState({ api: ownerApi(client), closed: false });
    }).catch(() => { if (mounted) setState({ api: null, closed: true }); });
    return () => { mounted = false; client.dispose(); };
  }, [ownerId, family]);
  if (state.closed) return <div role="status" className="space-y-3 py-6"><p>Your account changed. Reopen Store to continue.</p><Link href={reopenHref} className="gv-primary-button" onClick={event => { event.preventDefault(); window.location.assign(reopenHref); }}>Reopen Store</Link></div>;
  if (!state.api) return <p role="status" className="py-6">Loading your Store…</p>;
  return <StoreOwnerContext.Provider value={state.api}>{children}</StoreOwnerContext.Provider>;
}
