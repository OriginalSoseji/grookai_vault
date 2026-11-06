import { createPublicServerClient } from "@/lib/supabase/publicServer";

export type PublicLotLabel = {
  publicId: string;
  name: string;
  slug: string;
  createdAt: string;
};

export async function getPublicLotLabel(publicId: string): Promise<PublicLotLabel | null> {
  const normalized = publicId.trim();
  if (!/^[0-9a-f-]{36}$/i.test(normalized)) return null;

  const client = createPublicServerClient(30);
  const { data, error } = await client.rpc("lot_label_public_read_v1", {
    p_public_id: normalized,
  });
  if (error) return null;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object") return null;
  const value = row as Record<string, unknown>;
  const name = typeof value.name === "string" ? value.name.trim() : "";
  const slug = typeof value.slug === "string" ? value.slug.trim() : "";
  if (!name || !slug) return null;
  return {
    publicId: normalized,
    name,
    slug,
    createdAt: typeof value.created_at === "string" ? value.created_at : "",
  };
}
