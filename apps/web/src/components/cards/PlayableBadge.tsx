"use client";

import {useCallback, useSyncExternalStore} from "react";
import type {PlayableCardSignal} from "@/lib/playables/publicPlayables";

export default function PlayableBadge({signal}: {signal?: PlayableCardSignal}) {
  const expires = signal ? Date.parse(signal.valid_until) : 0;
  const subscribe = useCallback((onChange: () => void) => {
    const timer = setTimeout(onChange, Math.max(0, Math.min(expires - Date.now(), 86_400_000)));
    return () => clearTimeout(timer);
  }, [expires]);
  const current = useSyncExternalStore(subscribe, () => Date.now() < expires, () => Date.now() < expires);
  if (!signal || !current) return null;
  return (
    <span
      className="gv-hi-search-context inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium"
      title={`Used in ${signal.lists} recent Standard decklists across ${signal.events} events. Updated ${signal.as_of.slice(0, 10)}.`}
    >
      Playable
    </span>
  );
}
