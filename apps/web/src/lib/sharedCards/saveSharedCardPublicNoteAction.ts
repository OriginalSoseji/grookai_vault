"use server";

import { revalidatePath } from "next/cache";
import { createServerComponentClient } from "@/lib/supabase/server";

export type SaveSharedCardPublicNoteInput = {
  itemId: string;
  note: string;
};

export type SaveSharedCardPublicNoteResult =
  | {
      ok: true;
      itemId: string;
      publicNote: string | null;
    }
  | {
      ok: false;
      itemId: string;
      message: string;
    };

type VaultRow = {
  card_id: string | null;
  gv_id: string | null;
};

type SharedCardRow = {
  public_note: string | null;
};

type PublicProfileRow = {
  slug: string | null;
};

export async function saveSharedCardPublicNoteAction(
  input: SaveSharedCardPublicNoteInput,
): Promise<SaveSharedCardPublicNoteResult> {
  const client = createServerComponentClient();
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    return {
      ok: false,
      itemId: input.itemId,
      message: "Sign in required.",
    };
  }

  const { data: vaultRow, error: vaultError } = await client
    .from("vault_items")
    .select("card_id,gv_id")
    .eq("id", input.itemId)
    .eq("user_id", user.id)
    .is("archived_at", null)
    .maybeSingle();

  if (vaultError || !vaultRow) {
    return {
      ok: false,
      itemId: input.itemId,
      message: "Vault card could not be resolved.",
    };
  }

  const row = vaultRow as VaultRow;
  if (!row.card_id || !row.gv_id) {
    return {
      ok: false,
      itemId: input.itemId,
      message: "Vault card is missing canonical card identity.",
    };
  }

  const trimmedNote = input.note.trim();
  const nextPublicNote = trimmedNote.length > 0 ? trimmedNote : null;

  const { data: existingSharedRow, error: existingSharedError } = await client
    .from("shared_cards")
    .select("public_note")
    .eq("user_id", user.id)
    .eq("card_id", row.card_id)
    .maybeSingle();

  if (existingSharedError || !existingSharedRow) {
    return {
      ok: false,
      itemId: input.itemId,
      message: "Share this card before adding a public note.",
    };
  }

  const { error: updateError } = await client
    .from("shared_cards")
    .update({
      public_note: nextPublicNote,
    })
    .eq("user_id", user.id)
    .eq("card_id", row.card_id);

  if (updateError) {
    return {
      ok: false,
      itemId: input.itemId,
      message: "Couldn’t save public note.",
    };
  }

  const { data: profileRow } = await client.from("public_profiles").select("slug").eq("user_id", user.id).maybeSingle();
  const profile = (profileRow ?? null) as PublicProfileRow | null;

  revalidatePath("/vault");
  if (profile?.slug) {
    revalidatePath(`/u/${profile.slug}/collection`);
    revalidatePath(`/u/${profile.slug}/pokemon`);
  }

  return {
    ok: true,
    itemId: input.itemId,
    publicNote: nextPublicNote,
  };
}
