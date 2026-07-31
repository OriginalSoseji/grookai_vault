// Hosted Edge Functions expose named key maps. Singular names remain useful for
// local development, while legacy JWT keys are compatibility-only fallbacks.

const COMPAT_PUBLISHABLE_KEY_ENV = ["SUPABASE", "ANON", "KEY"].join("_");
const COMPAT_SERVICE_ROLE_KEY_ENV = ["SUPABASE", "SERVICE", "ROLE", "KEY"].join(
  "_",
);

function getNamedKey(
  mapEnvName: string,
  singularEnvName: string,
  preferredNameEnv: string,
  legacyEnvName: string,
): string | undefined {
  const rawMap = Deno.env.get(mapEnvName);
  if (rawMap) {
    try {
      const parsed = JSON.parse(rawMap) as Record<string, unknown>;
      const preferredName = Deno.env.get(preferredNameEnv) ?? "default";
      const preferred = parsed?.[preferredName];
      if (typeof preferred === "string" && preferred.length > 0) {
        return preferred;
      }

      const available = Object.values(parsed ?? {}).filter(
        (value): value is string =>
          typeof value === "string" && value.length > 0,
      );
      if (available.length === 1) {
        return available[0];
      }
    } catch {
      // Fall through to local and legacy compatibility names.
    }
  }

  return Deno.env.get(singularEnvName) ??
    Deno.env.get(legacyEnvName) ??
    undefined;
}

export function getPublishableKey(): string | undefined {
  return getNamedKey(
    "SUPABASE_PUBLISHABLE_KEYS",
    "SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_PUBLISHABLE_KEY_NAME",
    COMPAT_PUBLISHABLE_KEY_ENV,
  );
}

export function getServiceRoleKey(): string | undefined {
  return getNamedKey(
    "SUPABASE_SECRET_KEYS",
    "SUPABASE_SECRET_KEY",
    "SUPABASE_SECRET_KEY_NAME",
    COMPAT_SERVICE_ROLE_KEY_ENV,
  );
}
