export function getServiceRoleKey(): string | undefined {
  const k = Deno.env.get("SUPABASE_SECRET_KEY");
  return k ?? undefined;
}

