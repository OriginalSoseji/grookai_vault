"use client";

import Link from "next/link";
import {useEffect, useState} from "react";

type Workspace = {
  catalogEnabled: boolean;
  connections: Array<{id: string; environment: string; status: string; locationId: string | null; autoSync: boolean}>;
  commerce?: {enabled: boolean; connections: Array<{id: string; autoEnroll: boolean; sellOnSquare: boolean; pending: number; reviews: number}>};
};

export default function VendorSquareSummary() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(true);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    void fetch("/api/square", {cache: "no-store", signal: AbortSignal.any([controller.signal, AbortSignal.timeout(65000)])})
      .then(async response => {
        if (!response.ok) throw Error("Square status unavailable");
        const value = await response.json() as Workspace;
        if (!Array.isArray(value.connections)) throw Error("Square status unavailable");
        if (active) setWorkspace(value);
      })
      .catch(() => {if (active) setError(true);})
      .finally(() => {if (active) setChecking(false);});
    return () => {active = false; controller.abort();};
  }, [revision]);

  // A sandbox link, an unsaved preference, or a paused server flag cannot make
  // the live selling setup ready. This is a settings summary, not a POS readback.
  const connection = workspace?.connections.find(row => row.environment === "production" && row.status === "connected");
  const commerce = workspace?.commerce?.connections.find(row => row.id === connection?.id);
  const ready = !!(workspace?.catalogEnabled && workspace.commerce?.enabled && connection?.locationId && connection.autoSync && commerce?.autoEnroll && commerce.sellOnSquare);
  const summary = checking ? "Checking Square…" : error ? "Square status is unavailable" : !connection ? "Connect Square" : !ready ? "Finish Square setup" : commerce!.reviews > 0 ? "Square needs attention" : "Automatic Square sync is enabled";
  return <section className="space-y-2 border-b border-[var(--gv-border-soft)] py-5" aria-labelledby="vendor-square-heading">
    <h2 id="vendor-square-heading" className="text-lg font-semibold">Square</h2>
    <p role="status" aria-live="polite" className="text-sm">{summary}</p>
    {!checking && !error && ready && <p className="text-sm text-[var(--gv-text-secondary)]">{commerce!.pending} pending · {commerce!.reviews} need review. Check each card’s confirmed sync before checkout.</p>}
    <p className="text-sm text-[var(--gv-text-secondary)]">Your grookai QR opens the card on a phone and finds it in Square POS. Take payments in Square.</p>
    <div className="flex flex-wrap gap-2">
      <Link href="/account/connections/square" className="gv-secondary-button">{connection ? "Open Square setup" : "Set up Square"}</Link>
      {error && <button className="gv-secondary-button" disabled={checking} onClick={() => {setError(false); setChecking(true); setRevision(value => value + 1);}}>Check again</button>}
    </div>
  </section>;
}
