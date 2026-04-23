import "server-only";

import { revalidatePath } from "next/cache";
import { createServerComponentClient } from "@/lib/supabase/server";

export async function revalidateOwnerWallSectionPaths(userId: string) {
  revalidatePath("/account");
  revalidatePath("/wall");

  const client = createServerComponentClient();
  const { data: profile } = await client
    .from("public_profiles")
    .select("slug")
    .eq("user_id", userId)
    .maybeSingle();

  const slug = typeof profile?.slug === "string" ? profile.slug : null;
  if (slug) {
    revalidatePath(`/u/${slug}`);
    revalidatePath(`/u/${slug}/collection`);

    const { data: sections } = await client
      .from("wall_sections")
      .select("id")
      .eq("user_id", userId);

    for (const section of sections ?? []) {
      if (typeof section.id === "string" && section.id.trim()) {
        revalidatePath(`/u/${slug}/section/${section.id}`);
      }
    }
  }
}
