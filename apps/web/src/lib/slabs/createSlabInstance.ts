"use server";

import { revalidatePath } from "next/cache";
import { createServerAdminClient } from "@/lib/supabase/admin";
import { normalizePsaGradeValue } from "@/lib/slabs/normalizePsaGrade";
import { verifyPsaCert } from "@/lib/slabs/psaVerificationAdapter";

export type CreateSlabInstanceInput = {
  userId: string;
  cardPrintId: string;
  gvId: string;
  cardName: string;
  setName?: string | null;
  cardImageUrl?: string | null;
  grader: "PSA";
  selectedGrade: string;
  certNumber: string;
  certNumberConfirm: string;
};

export type CreateSlabInstanceResult =
  | {
      ok: true;
      gvviId: string | null;
      slabCertId: string;
      grade: string;
      certNumber: string;
    }
  | {
      ok: false;
      errorCode:
        | "UNAUTHENTICATED"
        | "MISSING_CARD_CONTEXT"
        | "CERT_MISMATCH"
        | "VERIFICATION_FAILED"
        | "PSA_UNREACHABLE"
        | "GRADE_MISMATCH"
        | "CARD_IDENTITY_UNVERIFIED"
        | "CREATE_FAILED";
      message: string;
    };

type ExistingSlabCertRow = {
  id: string;
  card_print_id: string | null;
  grade: number | string | null;
};

type InsertedAnchorRow = {
  id: string;
};

type CreatedInstanceRow = {
  id: string;
  gv_vi_id: string | null;
};

function normalizeOptionalText(value: string | null | undefined) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeCertNumber(value: string) {
  return value.trim().replace(/\s+/g, "").replace(/-/g, "");
}

function parseNumericGrade(value: string) {
  const parsed = Number(normalizePsaGradeValue(value) ?? value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeGradeValue(value: number | string | null | undefined) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value.toString() : null;
  }

  return normalizeOptionalText(value);
}

function mapVerificationFailure(errorCode: string | undefined): CreateSlabInstanceResult {
  if (
    errorCode === "PSA_CHALLENGE_BLOCKED" ||
    errorCode === "FETCH_EXCEPTION" ||
    errorCode?.startsWith("HTTP_")
  ) {
    return {
      ok: false,
      errorCode: "PSA_UNREACHABLE",
      message: "PSA verification is unavailable right now. Try again later.",
    };
  }

  return {
    ok: false,
    errorCode: "VERIFICATION_FAILED",
    message: "This PSA cert could not be verified.",
  };
}

async function resolveOrCreateSlabCert({
  adminClient,
  cardPrintId,
  certNumber,
  grade,
}: {
  adminClient: ReturnType<typeof createServerAdminClient>;
  cardPrintId: string;
  certNumber: string;
  grade: string;
}) {
  const normalizedCertNumber = normalizeCertNumber(certNumber);
  const parsedGrade = parseNumericGrade(grade);
  if (!normalizedCertNumber || parsedGrade === null) {
    return {
      ok: false as const,
      errorCode: "CREATE_FAILED" as const,
      message: "Verified slab data was incomplete.",
    };
  }

  const { data: existingRow, error: existingError } = await adminClient
    .from("slab_certs")
    .select("id,card_print_id,grade")
    .eq("normalized_grader", "PSA")
    .eq("normalized_cert_number", normalizedCertNumber)
    .maybeSingle();

  if (existingError) {
    return {
      ok: false as const,
      errorCode: "CREATE_FAILED" as const,
      message: "Existing slab cert lookup failed.",
    };
  }

  const existingCert = (existingRow ?? null) as ExistingSlabCertRow | null;
  if (existingCert) {
    if ((existingCert.card_print_id?.trim() ?? "") !== cardPrintId) {
      return {
        ok: false as const,
        errorCode: "CARD_IDENTITY_UNVERIFIED" as const,
        message: "This PSA cert is already attached to a different card identity.",
      };
    }

    const existingGrade = normalizeGradeValue(existingCert.grade);
    const normalizedVerifiedGrade = normalizePsaGradeValue(grade);
    if (!existingGrade || !normalizedVerifiedGrade || existingGrade !== normalizedVerifiedGrade) {
      return {
        ok: false as const,
        errorCode: "GRADE_MISMATCH" as const,
        message: "Existing slab cert grade does not match PSA verification.",
      };
    }

    return {
      ok: true as const,
      slabCertId: existingCert.id,
    };
  }

  const now = new Date().toISOString();
  const { data: insertedRow, error: insertError } = await adminClient
    .from("slab_certs")
    .insert({
      grader: "PSA",
      cert_number: certNumber.trim(),
      card_print_id: cardPrintId,
      grade: parsedGrade,
      first_seen_at: now,
      last_seen_at: now,
    })
    .select("id")
    .single();

  if (insertError) {
    const { data: refetchedRow, error: refetchError } = await adminClient
      .from("slab_certs")
      .select("id,card_print_id,grade")
      .eq("normalized_grader", "PSA")
      .eq("normalized_cert_number", normalizedCertNumber)
      .maybeSingle();

    if (refetchError || !refetchedRow) {
      return {
        ok: false as const,
        errorCode: "CREATE_FAILED" as const,
        message: "Slab cert could not be created.",
      };
    }

    const refetchedCert = refetchedRow as ExistingSlabCertRow;
    if ((refetchedCert.card_print_id?.trim() ?? "") !== cardPrintId) {
      return {
        ok: false as const,
        errorCode: "CARD_IDENTITY_UNVERIFIED" as const,
        message: "This PSA cert resolved to a different card identity.",
      };
    }

    const refetchedGrade = normalizeGradeValue(refetchedCert.grade);
    const normalizedVerifiedGrade = normalizePsaGradeValue(grade);
    if (!refetchedGrade || !normalizedVerifiedGrade || refetchedGrade !== normalizedVerifiedGrade) {
      return {
        ok: false as const,
        errorCode: "GRADE_MISMATCH" as const,
        message: "Resolved slab cert grade does not match PSA verification.",
      };
    }

    return {
      ok: true as const,
      slabCertId: refetchedCert.id,
    };
  }

  const insertedCert = (insertedRow ?? null) as { id: string } | null;
  if (!insertedCert?.id) {
    return {
      ok: false as const,
      errorCode: "CREATE_FAILED" as const,
      message: "Slab cert create returned no row.",
    };
  }

  return {
    ok: true as const,
    slabCertId: insertedCert.id,
  };
}

export async function createSlabInstance(input: CreateSlabInstanceInput): Promise<CreateSlabInstanceResult> {
  const userId = input.userId.trim();
  const cardPrintId = input.cardPrintId.trim();
  const gvId = input.gvId.trim();
  const selectedGrade = input.selectedGrade.trim();
  const certNumber = input.certNumber.trim();
  const certNumberConfirm = input.certNumberConfirm.trim();

  if (!userId) {
    return {
      ok: false,
      errorCode: "UNAUTHENTICATED",
      message: "Sign in required.",
    };
  }

  if (!cardPrintId || !gvId) {
    return {
      ok: false,
      errorCode: "MISSING_CARD_CONTEXT",
      message: "Card context could not be resolved.",
    };
  }

  if (input.grader !== "PSA") {
    return {
      ok: false,
      errorCode: "CREATE_FAILED",
      message: "Only PSA slabs are supported in V1.",
    };
  }

  if (!certNumber || certNumber !== certNumberConfirm) {
    return {
      ok: false,
      errorCode: "CERT_MISMATCH",
      message: "Certification numbers must match exactly.",
    };
  }

  const verification = await verifyPsaCert(certNumber);
  if (!verification.verified || !verification.grade || verification.grader !== "PSA") {
    return mapVerificationFailure(verification.error_code);
  }

  const normalizedVerifiedGrade = normalizePsaGradeValue(verification.grade);
  if (!normalizedVerifiedGrade) {
    return {
      ok: false,
      errorCode: "VERIFICATION_FAILED",
      message: "PSA returned a grade that could not be normalized.",
    };
  }

  if (normalizedVerifiedGrade !== selectedGrade) {
    return {
      ok: false,
      errorCode: "GRADE_MISMATCH",
      message: `PSA verified this cert as grade ${verification.grade}, not ${selectedGrade}.`,
    };
  }

  const adminClient = createServerAdminClient();
  const slabCertResult = await resolveOrCreateSlabCert({
    adminClient,
    cardPrintId,
    certNumber,
    grade: verification.grade,
  });

  if (!slabCertResult.ok) {
    return slabCertResult;
  }

  const { data: existingInstanceRow, error: existingInstanceError } = await adminClient
    .from("vault_item_instances")
    .select("id")
    .eq("user_id", userId)
    .eq("slab_cert_id", slabCertResult.slabCertId)
    .is("archived_at", null)
    .maybeSingle();

  if (existingInstanceError) {
    return {
      ok: false,
      errorCode: "CREATE_FAILED",
      message: "Existing slab ownership could not be checked.",
    };
  }

  if (existingInstanceRow) {
    return {
      ok: false,
      errorCode: "CREATE_FAILED",
      message: "This verified slab is already in your vault.",
    };
  }

  const gradeLabel = `PSA ${verification.grade}`;
  const now = new Date().toISOString();
  const { data: insertedAnchorRow, error: anchorError } = await adminClient
    .from("vault_items")
    .insert({
      user_id: userId,
      card_id: cardPrintId,
      gv_id: gvId,
      qty: 1,
      condition_label: "SLAB",
      is_graded: true,
      grade_company: "PSA",
      grade_value: verification.grade,
      grade_label: gradeLabel,
      name: input.cardName.trim() || "Unknown card",
      set_name: input.setName?.trim() || null,
      photo_url: input.cardImageUrl ?? null,
      created_at: now,
    })
    .select("id")
    .single();

  if (anchorError) {
    return {
      ok: false,
      errorCode: "CREATE_FAILED",
      message: "Slab ownership episode could not be created.",
    };
  }

  const anchor = (insertedAnchorRow ?? null) as InsertedAnchorRow | null;
  if (!anchor?.id) {
    return {
      ok: false,
      errorCode: "CREATE_FAILED",
      message: "Slab ownership episode returned no row.",
    };
  }

  const { data: createdInstanceRow, error: instanceError } = await adminClient.rpc("admin_vault_instance_create_v1", {
    p_user_id: userId,
    p_slab_cert_id: slabCertResult.slabCertId,
    p_legacy_vault_item_id: anchor.id,
    p_is_graded: true,
    p_grade_company: "PSA",
    p_grade_value: verification.grade,
    p_grade_label: gradeLabel,
    p_name: input.cardName.trim() || "Unknown card",
    p_set_name: input.setName?.trim() || null,
    p_image_url: verification.image_url ?? input.cardImageUrl ?? null,
    p_created_at: now,
  });

  if (instanceError) {
    await adminClient
      .from("vault_items")
      .update({
        qty: 0,
        archived_at: new Date().toISOString(),
      })
      .eq("id", anchor.id)
      .eq("user_id", userId)
      .is("archived_at", null);

    return {
      ok: false,
      errorCode: "CREATE_FAILED",
      message: "Slab instance could not be created.",
    };
  }

  const createdInstance = (Array.isArray(createdInstanceRow) ? createdInstanceRow[0] : createdInstanceRow) as
    | CreatedInstanceRow
    | null;

  if (!createdInstance?.id) {
    return {
      ok: false,
      errorCode: "CREATE_FAILED",
      message: "Slab instance create returned no row.",
    };
  }

  revalidatePath("/vault");
  revalidatePath("/wall");
  revalidatePath(`/card/${gvId}`);

  return {
    ok: true,
    gvviId: createdInstance.gv_vi_id ?? null,
    slabCertId: slabCertResult.slabCertId,
    grade: verification.grade,
    certNumber: verification.cert_number,
  };
}
