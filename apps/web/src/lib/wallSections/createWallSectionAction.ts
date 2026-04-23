"use server";

import { createServerComponentClient } from "@/lib/supabase/server";
import { getOwnerWallSections } from "@/lib/wallSections/getOwnerWallSections";
import { revalidateOwnerWallSectionPaths } from "@/lib/wallSections/revalidateWallSectionPaths";
import {
  countActiveWallSections,
  hasDuplicateWallSectionName,
  normalizeWallSectionName,
  validateWallSectionName,
  WALL_SECTION_LIMIT_MESSAGE,
  WALL_SECTION_STORED_LIMIT_MESSAGE,
  type WallSectionActionResult,
} from "@/lib/wallSections/wallSectionTypes";

type CreateWallSectionInput = {
  name: string;
};

export async function createWallSectionAction(input: CreateWallSectionInput): Promise<WallSectionActionResult> {
  const client = createServerComponentClient();
  const {
    data: { user },
  } = await client.auth.getUser();

  const name = normalizeWallSectionName(input.name);
  const nameError = validateWallSectionName(name);

  if (!user) {
    return {
      ok: false,
      message: "Sign in required.",
      fieldErrors: { form: "Sign in required." },
    };
  }

  if (nameError) {
    return {
      ok: false,
      message: "Fix the highlighted fields before saving.",
      fieldErrors: { name: nameError },
    };
  }

  const current = await getOwnerWallSections(user.id);
  const sections = current.sections;

  if (sections.length >= current.limitState.storedLimit) {
    return {
      ok: false,
      message: WALL_SECTION_STORED_LIMIT_MESSAGE,
      fieldErrors: { form: WALL_SECTION_STORED_LIMIT_MESSAGE },
      sections,
      limitState: current.limitState,
    };
  }

  if (countActiveWallSections(sections) >= current.limitState.activeLimit) {
    return {
      ok: false,
      message: WALL_SECTION_LIMIT_MESSAGE,
      fieldErrors: { form: WALL_SECTION_LIMIT_MESSAGE },
      sections,
      limitState: current.limitState,
    };
  }

  if (hasDuplicateWallSectionName(sections, name)) {
    return {
      ok: false,
      message: "You already have a section with that name.",
      fieldErrors: { name: "You already have a section with that name." },
      sections,
      limitState: current.limitState,
    };
  }

  const nextPosition = sections.reduce((max, section) => Math.max(max, section.position), -1) + 1;

  const { error } = await client.from("wall_sections").insert({
    user_id: user.id,
    name,
    position: nextPosition,
    is_active: true,
    // LOCK: Created custom sections surface automatically; is_public is compatibility data, not product visibility.
    is_public: true,
  });

  if (error) {
    return {
      ok: false,
      message: "Section could not be created.",
      fieldErrors: { form: error.message },
      sections,
      limitState: current.limitState,
    };
  }

  await revalidateOwnerWallSectionPaths(user.id);
  const next = await getOwnerWallSections(user.id);

  return {
    ok: true,
    message: "Section created.",
    sections: next.sections,
    limitState: next.limitState,
  };
}
