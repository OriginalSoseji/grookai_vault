"use client";
import Link from "next/link";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabaseClient";
import { createOrderOwnerClient } from "@/lib/orders/orderOwnerClient";

const OrderOwnerContext = createContext<ReturnType<typeof createOrderOwnerClient> | null>(null);
export function useOrderOwnerApi() {
  const value = useContext(OrderOwnerContext);
  if (!value) throw new Error("Private order actions require an account scope");
  return value;
}
type Props = { ownerId: string; children: ReactNode; reopenHref?: string };
export function OrderOwnerScope(props: Props) {
  return <OrderOwnerSession key={`${props.ownerId}:${props.reopenHref ?? "/account/orders"}`} {...props} />;
}
function OrderOwnerSession({ ownerId, children, reopenHref = "/account/orders" }: Props) {
  const [state, setState] = useState<{ api: ReturnType<typeof createOrderOwnerClient> | null; closed: boolean }>({ api: null, closed: false });
  useEffect(() => {
    let mounted = true;
    const client = createOrderOwnerClient(ownerId, supabase.auth, fetch, () => {
      if (mounted) setState({ api: null, closed: true });
    });
    void client.ready().then(() => {
      if (mounted && client.current()) setState({ api: client, closed: false });
    }).catch(() => { if (mounted) setState({ api: null, closed: true }); });
    return () => { mounted = false; client.dispose(); };
  }, [ownerId]);
  if (state.closed) return <div role="status" className="space-y-3 px-4 py-6">
    <p>Your account changed. Reopen Orders to continue.</p>
    <Link href={reopenHref} className="gv-primary-button" onClick={event => { event.preventDefault(); window.location.assign(reopenHref); }}>Reopen Orders</Link>
  </div>;
  if (!state.api) return <p role="status" className="px-4 py-6">Loading your Orders…</p>;
  return <OrderOwnerContext.Provider value={state.api}>{children}</OrderOwnerContext.Provider>;
}
