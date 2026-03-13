"use server";

import { revalidatePath } from "next/cache";
import type { PostgrestError } from "@supabase/supabase-js";
import {
  normalizePublicProfileSettings,
  type PublicProfileSettingsErrors,
  type PublicProfileSettingsValues,
  validatePublicProfileSettings,
} from "@/lib/publicProfileSettings";
import { createServerComponentClient } from "@/lib/supabase/server";

export type SavePublicProfileSettingsResult = {
  ok: boolean;
  message?: string;
  values: PublicProfileSettingsValues;
  fieldErrors: PublicProfileSettingsErrors;
};

function formatPublicProfileError(error: PostgrestError) {
  if (error.code === "23505") {
    return {
      slug: "That profile URL is already taken.",
    } satisfies PublicProfileSettingsErrors;
  }

  return {
    form: error.message,
  } satisfies PublicProfileSettingsErrors;
}

export async function savePublicProfileSettings(
  values: PublicProfileSettingsValues,
): Promise<SavePublicProfileSettingsResult> {
  const client = createServerComponentClient();
  const {
    data: { user },
  } = await client.auth.getUser();

  const normalizedValues = normalizePublicProfileSettings(values);

  if (!user) {
    return {
      ok: false,
      message: "Sign in required.",
      values: normalizedValues,
      fieldErrors: {
        form: "Sign in required.",
      },
    };
  }

  const fieldErrors = validatePublicProfileSettings(normalizedValues);
  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      message: "Fix the highlighted fields before saving.",
      values: normalizedValues,
      fieldErrors,
    };
  }

  const payload = {
    user_id: user.id,
    slug: normalizedValues.slug,
    display_name: normalizedValues.displayName,
    public_profile_enabled: normalizedValues.publicProfileEnabled,
    vault_sharing_enabled: normalizedValues.vaultSharingEnabled,
  };

  const { data, error } = await client
    .from("public_profiles")
    .upsert(payload, {
      onConflict: "user_id",
    })
    .select("slug,display_name,public_profile_enabled,vault_sharing_enabled")
    .single();

  if (error) {
    return {
      ok: false,
      message: "Public profile settings could not be saved.",
      values: normalizedValues,
      fieldErrors: formatPublicProfileError(error),
    };
  }

  revalidatePath("/account");

  return {
    ok: true,
    message: "Public profile settings saved.",
    values: {
      slug: data.slug ?? normalizedValues.slug,
      displayName: data.display_name ?? normalizedValues.displayName,
      publicProfileEnabled: Boolean(data.public_profile_enabled),
      vaultSharingEnabled: Boolean(data.vault_sharing_enabled),
    },
    fieldErrors: {},
  };
}
