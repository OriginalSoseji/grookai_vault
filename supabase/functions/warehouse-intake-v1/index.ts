import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { requireUser } from "../_shared/auth.ts";
import { corsHeaders, corsJson } from "../_shared/cors.ts";

type SubmissionIntent = "MISSING_CARD" | "MISSING_IMAGE";
type IntakeChannel = "SCAN" | "UPLOAD" | "MANUAL";
type ImageSlot = "front" | "back";

type IntakePayload = {
  notes?: string;
  tcgplayer_id?: string | null;
  submission_intent?: SubmissionIntent;
  intake_channel?: IntakeChannel;
  evidence?: {
    identity_snapshot_id?: string | null;
    condition_snapshot_id?: string | null;
    identity_scan_event_id?: string | null;
    images?: Array<{
      type: ImageSlot;
      storage_path: string;
    }>;
  };
};

const ALLOWED_INTENTS = new Set<SubmissionIntent>(["MISSING_CARD", "MISSING_IMAGE"]);
const ALLOWED_CHANNELS = new Set<IntakeChannel>(["SCAN", "UPLOAD", "MANUAL"]);
const ALLOWED_IMAGE_SLOTS = new Set<ImageSlot>(["front", "back"]);

function isUuid(value: string | null | undefined): value is string {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function cleanOptionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseImages(value: unknown): Array<{ type: ImageSlot; storage_path: string }> {
  if (value == null) return [];
  if (!Array.isArray(value)) {
    throw Object.assign(new Error("invalid_images"), { code: "invalid_images" });
  }

  return value.map((entry, index) => {
    if (!entry || typeof entry !== "object") {
      throw Object.assign(new Error("invalid_image_entry"), {
        code: "invalid_image_entry",
        index,
      });
    }

    const type = cleanOptionalString((entry as Record<string, unknown>).type);
    const storagePath = cleanOptionalString((entry as Record<string, unknown>).storage_path);

    if (!type || !ALLOWED_IMAGE_SLOTS.has(type as ImageSlot)) {
      throw Object.assign(new Error("invalid_image_type"), {
        code: "invalid_image_type",
        index,
      });
    }
    if (!storagePath) {
      throw Object.assign(new Error("missing_image_storage_path"), {
        code: "missing_image_storage_path",
        index,
      });
    }

    return {
      type: type as ImageSlot,
      storage_path: storagePath,
    };
  });
}

function parsePayload(body: IntakePayload) {
  const notes = cleanOptionalString(body.notes);
  const tcgplayerId = cleanOptionalString(body.tcgplayer_id);
  const submissionIntent = cleanOptionalString(body.submission_intent) as SubmissionIntent | null;
  const intakeChannel = cleanOptionalString(body.intake_channel) as IntakeChannel | null;

  if (!notes) {
    throw Object.assign(new Error("notes_required"), { code: "notes_required" });
  }
  if (!submissionIntent || !ALLOWED_INTENTS.has(submissionIntent)) {
    throw Object.assign(new Error("invalid_submission_intent"), {
      code: "invalid_submission_intent",
    });
  }
  if (!intakeChannel || !ALLOWED_CHANNELS.has(intakeChannel)) {
    throw Object.assign(new Error("invalid_intake_channel"), {
      code: "invalid_intake_channel",
    });
  }

  const evidence = body.evidence ?? {};
  const identitySnapshotId = cleanOptionalString(evidence.identity_snapshot_id);
  const conditionSnapshotId = cleanOptionalString(evidence.condition_snapshot_id);
  const identityScanEventId = cleanOptionalString(evidence.identity_scan_event_id);
  const images = parseImages(evidence.images);

  if (identitySnapshotId && !isUuid(identitySnapshotId)) {
    throw Object.assign(new Error("invalid_identity_snapshot_id"), {
      code: "invalid_identity_snapshot_id",
    });
  }
  if (conditionSnapshotId && !isUuid(conditionSnapshotId)) {
    throw Object.assign(new Error("invalid_condition_snapshot_id"), {
      code: "invalid_condition_snapshot_id",
    });
  }
  if (identityScanEventId && !isUuid(identityScanEventId)) {
    throw Object.assign(new Error("invalid_identity_scan_event_id"), {
      code: "invalid_identity_scan_event_id",
    });
  }

  const hasEvidence =
    !!identitySnapshotId ||
    !!conditionSnapshotId ||
    !!identityScanEventId ||
    images.length > 0;

  if (!hasEvidence) {
    throw Object.assign(new Error("evidence_required"), { code: "evidence_required" });
  }

  if (submissionIntent === "MISSING_IMAGE" && !tcgplayerId && !identitySnapshotId) {
    throw Object.assign(new Error("missing_image_requires_reference"), {
      code: "missing_image_requires_reference",
    });
  }

  return {
    notes,
    tcgplayerId,
    submissionIntent,
    intakeChannel,
    identitySnapshotId,
    conditionSnapshotId,
    identityScanEventId,
    images,
  };
}

serve(async (req) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response("ok", {
        status: 200,
        headers: corsHeaders,
      });
    }
    if (req.method !== "POST") {
      return corsJson(405, { error: "method_not_allowed" });
    }

    let auth: Awaited<ReturnType<typeof requireUser>>;
    try {
      auth = await requireUser(req);
    } catch (err) {
      const code = (err as { code?: string } | null | undefined)?.code;
      if (code === "missing_bearer_token") return corsJson(401, { error: "missing_bearer_token" });
      if (code === "invalid_jwt") return corsJson(401, { error: "invalid_jwt" });
      if (code === "server_misconfigured") return corsJson(500, { error: "server_misconfigured" });
      throw err;
    }

    const body = (await req.json()) as IntakePayload;
    const parsed = parsePayload(body);
    const sb = auth.sb;
    const { data, error } = await sb.rpc("warehouse_intake_v1", {
      p_notes: parsed.notes,
      p_tcgplayer_id: parsed.tcgplayerId,
      p_submission_intent: parsed.submissionIntent,
      p_intake_channel: parsed.intakeChannel,
      p_identity_snapshot_id: parsed.identitySnapshotId,
      p_condition_snapshot_id: parsed.conditionSnapshotId,
      p_identity_scan_event_id: parsed.identityScanEventId,
      p_images: parsed.images.length ? parsed.images : null,
    });

    if (error || !data) {
      return corsJson(500, {
        error: "warehouse_intake_failed",
        detail: error?.message ?? "unknown",
      });
    }

    return corsJson(200, {
      success: true,
      candidate_id: data,
    });
  } catch (err) {
    const detail = String((err as Error)?.message ?? err);

    switch ((err as { code?: string })?.code) {
      case "notes_required":
      case "invalid_submission_intent":
      case "invalid_intake_channel":
      case "invalid_identity_snapshot_id":
      case "invalid_condition_snapshot_id":
      case "invalid_identity_scan_event_id":
      case "invalid_images":
      case "invalid_image_entry":
      case "invalid_image_type":
      case "missing_image_storage_path":
      case "evidence_required":
      case "missing_image_requires_reference":
        return corsJson(400, { error: (err as { code?: string }).code, detail });
      default:
        return corsJson(500, { error: "internal_error", detail });
    }
  }
});
