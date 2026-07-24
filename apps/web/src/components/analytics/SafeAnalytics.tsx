"use client";

import { Analytics } from "@vercel/analytics/react";
import { isBinderSecretPath } from "@/lib/binders/safePath";

export function isSecretBinderAnalyticsUrl(value: string) {
  try {
    const url = new URL(value, "https://grookaivault.com");
    const nextValue = url.searchParams.get("next") ?? "";
    let nextIsSecret = false;
    if (nextValue) {
      try {
        nextIsSecret = isBinderSecretPath(
          new URL(nextValue, "https://grookaivault.com").pathname,
        );
      } catch {
        // A malformed destination is unsafe to include in analytics.
        nextIsSecret = true;
      }
    }
    return (
      isBinderSecretPath(url.pathname) ||
      ((url.pathname === "/login" || url.pathname === "/auth/callback") &&
        nextIsSecret)
    );
  } catch {
    // Unparseable analytics events are rejected rather than guessed safe.
    return true;
  }
}

export function sanitizeBinderAnalyticsUrl(value: string) {
  if (isSecretBinderAnalyticsUrl(value)) {
    return null;
  }
  try {
    const url = new URL(value, "https://grookaivault.com");
    if (
      url.pathname === "/binders" ||
      url.pathname.startsWith("/binders/") ||
      url.pathname.startsWith("/binder-templates/")
    ) {
      // Cursor query strings may contain Binder contribution, membership, or
      // activity row IDs. Analytics needs the route, never those identifiers.
      return `${url.origin}${url.pathname}`;
    }
    return value;
  } catch {
    return null;
  }
}

/**
 * Analytics stays mounted across client navigation, so the safety check must
 * run for every event. Returning null is the SDK's fail-closed cancellation
 * mechanism and protects direct loads, SPA navigation, and back/forward.
 */
export function SafeAnalytics() {
  return (
    <Analytics
      beforeSend={(event) => {
        const safeUrl = sanitizeBinderAnalyticsUrl(event.url);
        return safeUrl ? { ...event, url: safeUrl } : null;
      }}
    />
  );
}
