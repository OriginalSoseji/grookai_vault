export function getServiceRoleKey(): string | undefined {
  const k = Deno.env.get("SUPABASE_SECRET_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  return k ?? undefined;
}
