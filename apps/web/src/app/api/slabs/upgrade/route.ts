import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { executeOwnerWriteV1 } from "@/lib/contracts/execute_owner_write_v1";
import { createVaultInstanceArchivedProofV1 } from "@/lib/contracts/owner_write_proofs_v1";
import { createSlabInstance } from "@/lib/slabs/createSlabInstance";
import { createServerAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type SlabUpgradePayload = {
  source_instance_id?: unknown;
  grader?: unknown;
  grade?: unknown;
  cert_number?: unknown;
  cert_number_confirm?: unknown;
  ownership_confirmed?: unknown;
  card_print_id?: unknown;
  gv_id?: unknown;
  card_name?: unknown;
  set_name?: unknown;
  card_image_url?: unknown;
};

type VaultInstanceLookupRow = {
  id: string;
  user_id: string;
  card_print_id: string | null;
  slab_cert_id: string | null;
  archived_at: string | null;
};

function cleanText(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function extractBearerToken(request: NextRequest) {
  const header =
    request.headers.get("authorization") ??
    request.headers.get("Authorization") ??
    "";
  const match = header.trim().match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : "";
}

function createUserScopedServiceClient(token: string) {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;

  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY.");
  }

  return createClient(url, key, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

class SlabUpgradeOwnerWriteError extends Error {
  status: number;
  code: string;
  detail?: string;

  constructor(input: {
    code: string;
    message: string;
    status: number;
    detail?: string;
  }) {
    super(input.message);
    this.name = "SlabUpgradeOwnerWriteError";
    this.status = input.status;
    this.code = input.code;
    this.detail = input.detail;
  }
}

function mapFailureStatus(errorCode: string | undefined) {
  switch (errorCode) {
    case "UNAUTHENTICATED":
      return 401;
    case "MISSING_CARD_CONTEXT":
    case "CERT_MISMATCH":
    case "GRADE_MISMATCH":
    case "CARD_IDENTITY_UNVERIFIED":
      return 400;
    case "VERIFICATION_FAILED":
      return 422;
    case "PSA_UNREACHABLE":
      return 503;
    default:
      return 500;
  }
}

export async function OPTIONS() {
  return NextResponse.json({ ok: true });
}

export async function POST(request: NextRequest) {
  try {
    const token = extractBearerToken(request);
    if (!token) {
      return NextResponse.json({ error: "missing_bearer_token" }, { status: 401 });
    }

    const adminClient = createServerAdminClient();
    const {
      data: { user },
      error: userError,
    } = await adminClient.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ error: "invalid_jwt" }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as SlabUpgradePayload | null;
    const sourceInstanceId = cleanText(body?.source_instance_id);
    const grader = cleanText(body?.grader);
    const selectedGrade = cleanText(body?.grade);
    const certNumber = cleanText(body?.cert_number);
    const certNumberConfirm = cleanText(body?.cert_number_confirm);
    const cardPrintId = cleanText(body?.card_print_id);
    const gvId = cleanText(body?.gv_id);
    const cardName = cleanText(body?.card_name);
    const setName = cleanText(body?.set_name) || null;
    const cardImageUrl = cleanText(body?.card_image_url) || null;
    const ownershipConfirmed = body?.ownership_confirmed == true;

    if (!ownershipConfirmed) {
      return NextResponse.json(
        {
          error: "ownership_confirmation_required",
          message: "Confirm ownership before saving this slab.",
        },
        { status: 400 },
      );
    }

    if (!sourceInstanceId) {
      return NextResponse.json(
        {
          error: "missing_source_instance_id",
          message: "Raw exact-copy source is required for slab upgrade.",
        },
        { status: 400 },
      );
    }

    if (grader !== "PSA") {
      return NextResponse.json(
        {
          error: "unsupported_grader",
          message: "Only PSA slabs are supported right now.",
        },
        { status: 400 },
      );
    }

    const { data: sourceRow, error: sourceError } = await adminClient
      .from("vault_item_instances")
      .select("id,user_id,card_print_id,slab_cert_id,archived_at")
      .eq("id", sourceInstanceId)
      .maybeSingle();

    if (sourceError) {
      return NextResponse.json(
        {
          error: "source_lookup_failed",
          message: sourceError.message,
        },
        { status: 500 },
      );
    }

    const sourceInstance = (sourceRow ?? null) as VaultInstanceLookupRow | null;
    if (!sourceInstance || cleanText(sourceInstance.user_id) != user.id) {
      return NextResponse.json(
        {
          error: "source_not_found",
          message: "This raw exact copy could not be found.",
        },
        { status: 404 },
      );
    }

    if (sourceInstance.archived_at != null) {
      return NextResponse.json(
        {
          error: "source_already_archived",
          message: "This exact copy is no longer active.",
        },
        { status: 400 },
      );
    }

    if (sourceInstance.slab_cert_id != null) {
      return NextResponse.json(
        {
          error: "source_already_slabbed",
          message: "This exact copy is already slabbed.",
        },
        { status: 400 },
      );
    }

    if (!cardPrintId || cardPrintId != cleanText(sourceInstance.card_print_id)) {
      return NextResponse.json(
        {
          error: "source_card_mismatch",
          message: "The raw copy no longer matches this card.",
        },
        { status: 400 },
      );
    }

    let createResult;
    try {
      createResult = await executeOwnerWriteV1({
        execution_name: "slabs_upgrade",
        actor_id: user.id,
        write: async (context) => {
          const slabResult = await createSlabInstance({
            userId: user.id,
            cardPrintId,
            gvId,
            cardName,
            setName,
            cardImageUrl,
            grader: "PSA",
            selectedGrade,
            certNumber,
            certNumberConfirm,
          });

          if (!slabResult.ok) {
            throw new SlabUpgradeOwnerWriteError({
              code: slabResult.errorCode,
              message: slabResult.message,
              status: mapFailureStatus(slabResult.errorCode),
            });
          }

          context.setMetadata("source_instance_id", sourceInstanceId);
          context.setMetadata("created_gvvi_id", slabResult.gvviId);

          const userScopedClient = createUserScopedServiceClient(token);
          const { error: archiveError } = await userScopedClient.rpc(
            "vault_archive_exact_instance_v1",
            {
              p_instance_id: sourceInstanceId,
            },
          );

          if (archiveError) {
            throw new SlabUpgradeOwnerWriteError({
              code: "upgrade_archive_failed",
              message:
                "The slab was created, but the raw copy could not be archived. The upgrade was rolled back.",
              status: 500,
              detail: archiveError.message,
            });
          }

          return slabResult;
        },
        proofs: [
          createVaultInstanceArchivedProofV1(({ getMetadata }) => {
            const instanceId = getMetadata<string>("source_instance_id");
            return instanceId ? { instanceId } : null;
          }),
        ],
        on_error: async ({ getMetadata, adminClient }) => {
          const createdGvviId = cleanText(getMetadata<string>("created_gvvi_id"));
          if (!createdGvviId) {
            return;
          }

          const { data: createdRow } = await adminClient
            .from("vault_item_instances")
            .select("id")
            .eq("gv_vi_id", createdGvviId)
            .maybeSingle();

          const createdInstanceId = cleanText(createdRow?.id);
          if (!createdInstanceId) {
            return;
          }

          const userScopedClient = createUserScopedServiceClient(token);
          await userScopedClient.rpc("vault_archive_exact_instance_v1", {
            p_instance_id: createdInstanceId,
          });
        },
      });
    } catch (error) {
      if (error instanceof SlabUpgradeOwnerWriteError) {
        return NextResponse.json(
          {
            error: error.code,
            message: error.message,
            detail: error.detail,
          },
          { status: error.status },
        );
      }

      throw error;
    }

    return NextResponse.json({
      ok: true,
      gvvi_id: createResult.gvviId,
      slab_cert_id: createResult.slabCertId,
      grade: createResult.grade,
      cert_number: createResult.certNumber,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "internal_error",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
