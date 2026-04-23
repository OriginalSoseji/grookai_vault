"use server";

import { createServerComponentClient } from "@/lib/supabase/server";
import { assertWallSectionStateProof } from "@/lib/contracts/ownershipMutationGuards";
import { getOwnerWallSections } from "@/lib/wallSections/getOwnerWallSections";
import { revalidateOwnerWallSectionPaths } from "@/lib/wallSections/revalidateWallSectionPaths";
import {
  canActivateWallSection,
  countActiveWallSections,
  hasDuplicateWallSectionName,
  normalizeWallSectionName,
  validateWallSectionName,
  WALL_SECTION_LIMIT_MESSAGE,
  type WallSectionActionResult,
} from "@/lib/wallSections/wallSectionTypes";

type UpdateWallSectionInput = {
  sectionId: string;
  name?: string;
  isActive?: boolean;
};

type ExistingWallSectionRow = {
  id: string | null;
  user_id: string | null;
  name: string | null;
  is_active: boolean | null;
};

function normalizeSectionId(value: unknown): string {
  return String(value ?? "").trim();
}

export async function updateWallSectionAction(input: UpdateWallSectionInput): Promise<WallSectionActionResult> {
  const client = createServerComponentClient();
  const {
    data: { user },
  } = await client.auth.getUser();

  const sectionId = normalizeSectionId(input.sectionId);

  if (!user) {
    return {
      ok: false,
      message: "Sign in required.",
      fieldErrors: { form: "Sign in required." },
    };
  }

  if (!sectionId || sectionId.toLowerCase() === "wall") {
    return {
      ok: false,
      message: "Wall is managed automatically.",
      fieldErrors: { form: "Wall is managed automatically." },
    };
  }

  const { data: existingRow, error: existingError } = await client
    .from("wall_sections")
    .select("id,user_id,name,is_active")
    .eq("id", sectionId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingError) {
    return {
      ok: false,
      message: "Section could not be loaded.",
      fieldErrors: { form: existingError.message },
    };
  }

  const existing = (existingRow ?? null) as ExistingWallSectionRow | null;
  if (!existing?.id || existing.user_id !== user.id) {
    return {
      ok: false,
      message: "Section not found.",
      fieldErrors: { form: "Section not found." },
    };
  }

  const current = await getOwnerWallSections(user.id);
  const sections = current.sections;
  const updatePayload: {
    name?: string;
    is_active?: boolean;
  } = {};

  if (Object.prototype.hasOwnProperty.call(input, "name")) {
    const name = normalizeWallSectionName(input.name);
    const nameError = validateWallSectionName(name);
    if (nameError) {
      return {
        ok: false,
        message: "Fix the highlighted fields before saving.",
        fieldErrors: { name: nameError },
        sections,
        limitState: current.limitState,
      };
    }

    if (hasDuplicateWallSectionName(sections, name, existing.id)) {
      return {
        ok: false,
        message: "You already have a section with that name.",
        fieldErrors: { name: "You already have a section with that name." },
        sections,
        limitState: current.limitState,
      };
    }

    updatePayload.name = name;
  }

  if (Object.prototype.hasOwnProperty.call(input, "isActive")) {
    const nextActive = Boolean(input.isActive);
    const currentlyActive = Boolean(existing.is_active);
    const activeCount = countActiveWallSections(sections);

    if (
      !canActivateWallSection({
        activeCount,
        activeLimit: current.limitState.activeLimit,
        currentlyActive,
        nextActive,
      })
    ) {
      return {
        ok: false,
        message: WALL_SECTION_LIMIT_MESSAGE,
        fieldErrors: { form: WALL_SECTION_LIMIT_MESSAGE },
        sections,
        limitState: current.limitState,
      };
    }

    updatePayload.is_active = nextActive;
  }

  if (Object.keys(updatePayload).length === 0) {
    return {
      ok: true,
      message: "No changes to save.",
      sections,
      limitState: current.limitState,
    };
  }

  const { error: updateError } = await client
    .from("wall_sections")
    .update(updatePayload)
    .eq("id", existing.id)
    .eq("user_id", user.id);

  if (updateError) {
    return {
      ok: false,
      message: "Section could not be saved.",
      fieldErrors: { form: updateError.message },
      sections,
      limitState: current.limitState,
    };
  }

  await assertWallSectionStateProof({
    sectionId: existing.id,
    userId: user.id,
    expectedName: updatePayload.name ?? existing.name ?? null,
    expectedIsActive:
      typeof updatePayload.is_active === "boolean" ? updatePayload.is_active : Boolean(existing.is_active),
  });

  await revalidateOwnerWallSectionPaths(user.id);
  const next = await getOwnerWallSections(user.id);

  return {
    ok: true,
    message: "Section saved.",
    sections: next.sections,
    limitState: next.limitState,
  };
}
