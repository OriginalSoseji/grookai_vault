"use client";

import type { WebEventPayload } from "@/lib/telemetry/events";

function cleanPayload(payload: WebEventPayload) {
  return {
    eventName: payload.eventName,
    path: payload.path?.trim() || undefined,
    gvId: payload.gvId?.trim() || undefined,
    setCode: payload.setCode?.trim() || undefined,
    searchQuery: payload.searchQuery?.trim() || undefined,
    metadata: payload.metadata ?? undefined,
    userId: payload.userId?.trim() || undefined,
  };
}

export function sendTelemetryEvent(payload: WebEventPayload) {
  const body = JSON.stringify(cleanPayload(payload));

  if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    const blob = new Blob([body], { type: "application/json" });
    navigator.sendBeacon("/api/telemetry", blob);
    return;
  }

  void fetch("/api/telemetry", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body,
    keepalive: true,
  }).catch(() => {
    // Telemetry is non-critical.
  });
}
