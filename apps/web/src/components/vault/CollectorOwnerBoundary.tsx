"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabaseClient";

/** Unmount private collection content as soon as its authenticated owner changes. */
type OwnerBoundaryProps = {
  ownerId: string;
  children: ReactNode;
  surface?: "Vault" | "Binders" | "Saved cards" | "Notifications";
  reopenHref?: "/vault" | "/binders" | "/saved" | "/account/notifications";
};

export function CollectorOwnerBoundary(props: OwnerBoundaryProps) {
  // New server content for a different owner must start in the checking state.
  return <OwnerSession key={props.ownerId} {...props} />;
}

function OwnerSession({ ownerId, children, surface = "Vault", reopenHref = "/vault" }: OwnerBoundaryProps) {
  const [state, setState] = useState<"checking" | "ready" | "closed">("checking");
  useEffect(() => {
    let active = true, closed = false, version = 0;
    const apply = (id: string | null) => {
      if (!active || closed) return;
      closed = id !== ownerId;
      setState(closed ? "closed" : "ready");
    };
    const { data } = supabase.auth.onAuthStateChange((_, session) => {
      version += 1;
      apply(session?.user.id ?? null);
    });
    const request = version;
    void supabase.auth.getSession().then(({ data: result }) => {
      if (request === version) apply(result.session?.user.id ?? null);
    }).catch(() => { if (request === version) apply(null); });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, [ownerId]);
  if (state === "checking") return <p role="status" className="py-6">Loading your {surface}…</p>;
  if (state === "closed") return <div role="status" className="space-y-3 py-6">
    <p>Your account changed. Reopen {surface} to {surface === "Notifications" ? "continue" : "view your collection"}.</p>
    <Link href={reopenHref} className="gv-primary-button" onClick={(event) => { event.preventDefault(); window.location.assign(reopenHref); }}>Reopen {surface}</Link>
  </div>;
  return children;
}
