"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const REFRESH_INTERVAL_MS = 60_000;

export default function FounderPricingRefreshControl() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [lastRefreshAt, setLastRefreshAt] = useState<string | null>(null);

  const refresh = useCallback(() => {
    startTransition(() => {
      router.refresh();
      setLastRefreshAt(new Date().toISOString());
    });
  }, [router]);

  useEffect(() => {
    const timer = window.setInterval(refresh, REFRESH_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [refresh]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-slate-500">
        Auto-refreshes every 60 seconds
        {lastRefreshAt
          ? `; last requested ${new Date(lastRefreshAt).toLocaleTimeString()}`
          : ""}
      </span>
      <button
        type="button"
        className="gv-secondary-button min-h-10 px-3 py-2 text-sm"
        onClick={refresh}
        disabled={isPending}
        aria-label="Refresh pricing platform status"
        title="Refresh pricing platform status"
      >
        {isPending ? "Refreshing" : "Refresh"}
      </button>
    </div>
  );
}
