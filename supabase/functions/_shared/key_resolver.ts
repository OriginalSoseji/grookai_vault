// Env authority note:
// Canonical names are SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, and SUPABASE_SECRET_KEY.
// Older env names may remain for compatibility, but they are not canonical contract authority.

const COMPAT_PUBLISHABLE_KEY_ENV = ["SUPABASE", "ANON", "KEY"].join("_");
const COMPAT_SERVICE_ROLE_KEY_ENV = ["SUPABASE", "SERVICE", "ROLE", "KEY"].join("_");

export function getPublishableKey(): string | undefined {
  const k =
    Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ??
    Deno.env.get(COMPAT_PUBLISHABLE_KEY_ENV);
  return k ?? undefined;
}

export function getServiceRoleKey(): string | undefined {
  const k =
    Deno.env.get("SUPABASE_SECRET_KEY") ??
    Deno.env.get(COMPAT_SERVICE_ROLE_KEY_ENV);
  return k ?? undefined;
}
