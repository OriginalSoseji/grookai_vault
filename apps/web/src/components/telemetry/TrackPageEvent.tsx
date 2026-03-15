"use client";

import { useEffect } from "react";
import { sendTelemetryEvent } from "@/lib/telemetry/client";
import type { WebEventName } from "@/lib/telemetry/events";

type TrackPageEventProps = {
  eventName: Extract<WebEventName, "page_view_card" | "page_view_set" | "vault_opened">;
  path: string;
  gvId?: string;
  setCode?: string;
};

const DEDUPE_WINDOW_MS = 5000;

function getStorageKey(eventName: string, path: string) {
  return `grookai-telemetry:${eventName}:${path}`;
}

export default function TrackPageEvent({ eventName, path, gvId, setCode }: TrackPageEventProps) {
  useEffect(() => {
    const storageKey = getStorageKey(eventName, path);
    const now = Date.now();
    const previous = window.sessionStorage.getItem(storageKey);

    if (previous) {
      const previousTs = Number(previous);
      if (Number.isFinite(previousTs) && now - previousTs < DEDUPE_WINDOW_MS) {
        return;
      }
    }

    window.sessionStorage.setItem(storageKey, String(now));
    sendTelemetryEvent({
      eventName,
      path,
      gvId,
      setCode,
    });
  }, [eventName, gvId, path, setCode]);

  return null;
}
