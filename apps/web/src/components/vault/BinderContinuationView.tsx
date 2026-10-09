"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { BinderContinuation } from "@/lib/binders/continuation";

export function BinderContinuationView({ ownerId, continuation }: {
  ownerId: string;
  continuation: BinderContinuation | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState(false);
  // Server authorization scopes the content. Verify browser ownership before revealing it;
  // an owner change permanently closes this instance, including delayed streamed content.
  const [authorizedOwner, setAuthorizedOwner] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    let version = 0;
    let closed = false;
    const apply = (id: string | null) => {
      if (!active || closed) return;
      if (id !== ownerId) closed = true;
      setAuthorizedOwner(id === ownerId && !closed ? ownerId : null);
    };
    const { data } = supabase.auth.onAuthStateChange((_, session) => {
      version += 1;
      apply(session?.user.id ?? null);
    });
    const request = version;
    void supabase.auth.getSession().then(({ data: sessionData }) => {
      if (request === version) apply(sessionData.session?.user.id ?? null);
    }).catch(() => { if (request === version) apply(null); });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, [ownerId]);

  if (authorizedOwner !== ownerId) return null;
  return <section aria-labelledby="binder-continuation-title" className="rounded-2xl border border-slate-200 px-3 py-2 dark:border-slate-700" data-binder-continuation>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 id="binder-continuation-title" className="font-semibold">Continue collecting</h2>
    </div>
    {continuation === null ? <div role="status" className="mt-3 space-y-2">
      <p>Your collection goals could not load.</p>
      <button disabled={pending} className="gv-secondary-button" onClick={() => startTransition(() => router.refresh())}>{pending ? "Loading…" : "Try again"}</button>
      <Link href="/binders" className="gv-secondary-button">All Binders</Link>
    </div> : <>
      {continuation.items.length > 0 ? <ul id="binder-continuation-goals" className={`mt-2 grid gap-2 ${expanded ? "md:grid-cols-3" : ""}`}>
        {(expanded ? continuation.items : continuation.items.slice(0, 1)).map((item) => <li key={item.publicId} className="min-w-0">
          <Link href={`/binders/${encodeURIComponent(item.publicId)}`} className="block h-full rounded-xl border border-slate-200 p-2.5 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 dark:border-slate-700 dark:hover:bg-slate-800">
            <p className="break-words font-medium">{item.title}</p>
            {item.role !== "owner" && <p className="text-xs text-slate-500">Shared Binder</p>}
            {item.totalSlots > 0 ? <>
              <p className="mt-1 text-sm">{item.completedSlots} / {item.totalSlots} {item.progressUnit === "finish_options" ? (item.totalSlots === 1 ? "finish option" : "finish options") : item.progressUnit === "custom_slots" ? (item.totalSlots === 1 ? "slot" : "slots") : (item.totalSlots === 1 ? "card" : "cards")}</p>
              <progress style={{ height: 6 }} className="mt-1 block w-full accent-emerald-600" aria-label={`${item.title} progress`} value={item.completedSlots} max={item.totalSlots} />
            </> : <p className="mt-2 text-sm">Choose cards to start this goal.</p>}
          </Link>
        </li>)}
      </ul> : <p className="mt-3 text-sm">{continuation.hasNoBinders ? "Start a Binder to work toward a collection goal." : continuation.hasMore ? "No unfinished goals in this recent page. Open all Binders to see more." : "Your existing Binders have no unfinished goals."}</p>}
      <div className="flex flex-wrap items-center justify-between gap-x-3">
        {continuation.items.length > 1 && <button type="button" className="min-h-11 text-sm font-medium underline underline-offset-4" aria-expanded={expanded} aria-controls="binder-continuation-goals" onClick={() => setExpanded(value => !value)}>{expanded ? "Show fewer goals" : `Show ${continuation.items.length - 1} more ${continuation.items.length === 2 ? "goal" : "goals"}`}</button>}
        <Link href="/binders" className="inline-flex min-h-11 items-center text-sm font-medium underline underline-offset-4">All Binders</Link>
      </div>
      {continuation.hasNoBinders && <Link href="/binders/new" className="gv-primary-button mt-3">Create a Binder</Link>}
      {expanded && continuation.items.length > 0 && continuation.hasMore && <p className="mt-2 text-xs text-slate-500">Showing recent goals. All Binders has more.</p>}
    </>}
  </section>;
}
