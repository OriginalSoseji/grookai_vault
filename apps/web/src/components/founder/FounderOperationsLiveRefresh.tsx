"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const REFRESH_SECONDS = 60;

export default function FounderOperationsLiveRefresh() {
  const router = useRouter();
  const [seconds, setSeconds] = useState(REFRESH_SECONDS);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const interval = window.setInterval(() => {
      setSeconds((current) => {
        if (current > 1) return current - 1;
        startTransition(() => router.refresh());
        return REFRESH_SECONDS;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [router]);

  return (
    <div className="flex items-center gap-3 text-xs text-stone-400">
      <span className="relative flex h-2 w-2" aria-hidden="true">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime-300 opacity-40" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-lime-300" />
      </span>
      <span>{pending ? "Refreshing live data" : `Refresh in ${seconds}s`}</span>
      <button
        type="button"
        onClick={() => {
          setSeconds(REFRESH_SECONDS);
          startTransition(() => router.refresh());
        }}
        disabled={pending}
        className="font-semibold text-lime-300 underline-offset-4 hover:underline active:translate-y-px disabled:opacity-60"
      >
        Refresh now
      </button>
    </div>
  );
}
