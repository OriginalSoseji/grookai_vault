// Env authority note:
// Canonical names are SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, and SUPABASE_SECRET_KEY.
// Older env names may remain for compatibility, but they are not canonical contract authority.

export function getServiceRoleKey(): string | undefined {
  const k = Deno.env.get("SUPABASE_SECRET_KEY");
  return k ?? undefined;
}

