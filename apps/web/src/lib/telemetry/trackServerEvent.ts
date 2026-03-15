import "server-only";

import { createServerAdminClient } from "@/lib/supabase/admin";
import type { WebEventPayload } from "@/lib/telemetry/events";

type WebEventInsertRow = {
  event_name: string;
  user_id: string | null;
  anonymous_id: string | null;
  path: string | null;
  gv_id: string | null;
  set_code: string | null;
  search_query: string | null;
  metadata: Record<string, unknown>;
};

function cleanString(value?: string | null, maxLength = 255) {
  const normalized = value?.trim();
  if (!normalized) {
    return null;
  }

  return normalized.slice(0, maxLength);
}

function normalizeMetadata(value?: Record<string, unknown> | null) {
  return value && typeof value === "object" ? value : {};
}

export async function trackServerEvent(payload: WebEventPayload) {
  const eventName = cleanString(payload.eventName, 64);
  if (!eventName) {
    return;
  }

  const row: WebEventInsertRow = {
    event_name: eventName,
    user_id: cleanString(payload.userId, 64),
    anonymous_id: cleanString(payload.anonymousId, 128),
    path: cleanString(payload.path, 500),
    gv_id: cleanString(payload.gvId, 128),
    set_code: cleanString(payload.setCode, 64),
    search_query: cleanString(payload.searchQuery, 200),
    metadata: normalizeMetadata(payload.metadata),
  };

  try {
    const supabase = createServerAdminClient();

    if (row.event_name === "account_created" && row.user_id) {
      const { data: existing, error: existingError } = await supabase
        .from("web_events")
        .select("id")
        .eq("event_name", "account_created")
        .eq("user_id", row.user_id)
        .limit(1)
        .maybeSingle();

      if (existingError) {
        throw existingError;
      }

      if (existing?.id) {
        return;
      }
    }

    const { error } = await supabase.from("web_events").insert(row);
    if (error) {
      throw error;
    }
  } catch (error) {
    console.error("[telemetry] trackServerEvent failed", {
      eventName: row.event_name,
      path: row.path,
      gvId: row.gv_id,
      setCode: row.set_code,
      error,
    });
  }
}
