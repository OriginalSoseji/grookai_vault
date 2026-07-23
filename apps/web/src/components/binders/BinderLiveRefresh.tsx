"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useBinderOnline } from "./BinderOfflineBanner";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Keep only the currently open Binder fresh. This bounded refresh avoids a
 * global subscription and re-runs the guarded read model after focus changes
 * or a short collaboration interval.
 */
export function BinderLiveRefresh({
  publicId,
  enabled = true,
}: {
  publicId: string;
  enabled?: boolean;
}) {
  const router = useRouter();
  const online = useBinderOnline();

  useEffect(() => {
    if (!online || !enabled || !UUID_PATTERN.test(publicId)) {
      return;
    }
    let realtimeTimer: number | null = null;
    let disposed = false;
    const inputIsActive = () => {
      const tag = document.activeElement?.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
    };
    const refresh = () => {
      if (document.visibilityState === "visible" && !inputIsActive()) {
        router.refresh();
      }
    };
    const runRealtimeRefresh = () => {
      if (disposed) {
        return;
      }
      if (
        document.visibilityState !== "visible" ||
        inputIsActive()
      ) {
        realtimeTimer = window.setTimeout(runRealtimeRefresh, 1000);
        return;
      }
      realtimeTimer = null;
      router.refresh();
    };
    const scheduleRealtimeRefresh = (payload: {
      new?: Record<string, unknown>;
    }) => {
      const row = payload.new ?? {};
      const revision = Number(row.revision);
      if (
        row.binder_public_id !== publicId ||
        !Number.isFinite(revision) ||
        revision < 1 ||
        typeof row.changed_at !== "string"
      ) {
        return;
      }
      if (realtimeTimer !== null) {
        window.clearTimeout(realtimeTimer);
      }
      realtimeTimer = window.setTimeout(runRealtimeRefresh, 650);
    };

    const channel = supabase
      .channel(`binder-refresh:${publicId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "binder_refresh_signals",
          filter: `binder_public_id=eq.${publicId}`,
        },
        scheduleRealtimeRefresh,
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "binder_refresh_signals",
          filter: `binder_public_id=eq.${publicId}`,
        },
        scheduleRealtimeRefresh,
      )
      .subscribe();

    const interval = window.setInterval(refresh, 60000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      disposed = true;
      if (realtimeTimer !== null) {
        window.clearTimeout(realtimeTimer);
      }
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
      void supabase.removeChannel(channel);
    };
  }, [enabled, online, publicId, router]);

  return null;
}
