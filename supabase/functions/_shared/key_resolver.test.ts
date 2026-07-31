import { getPublishableKey, getServiceRoleKey } from "./key_resolver.ts";

function assertEquals(actual: unknown, expected: unknown): void {
  if (actual !== expected) {
    throw new Error(
      `expected ${JSON.stringify(expected)}, received ${
        JSON.stringify(actual)
      }`,
    );
  }
}

const KEY_ENV_NAMES = [
  "SUPABASE_PUBLISHABLE_KEYS",
  "SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_PUBLISHABLE_KEY_NAME",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SECRET_KEYS",
  "SUPABASE_SECRET_KEY",
  "SUPABASE_SECRET_KEY_NAME",
  "SUPABASE_SERVICE_ROLE_KEY",
];

function withCleanKeyEnvironment(run: () => void): void {
  const original = new Map(
    KEY_ENV_NAMES.map((name) => [name, Deno.env.get(name)]),
  );
  try {
    for (const name of KEY_ENV_NAMES) Deno.env.delete(name);
    run();
  } finally {
    for (const [name, value] of original) {
      if (value === undefined) Deno.env.delete(name);
      else Deno.env.set(name, value);
    }
  }
}

Deno.test({
  name: "key resolver reads hosted named key maps",
  sanitizeResources: false,
  sanitizeOps: false,
  fn() {
    withCleanKeyEnvironment(() => {
      Deno.env.set(
        "SUPABASE_PUBLISHABLE_KEYS",
        JSON.stringify({ default: "sb_publishable_test" }),
      );
      Deno.env.set(
        "SUPABASE_SECRET_KEYS",
        JSON.stringify({ super_secret_key: "sb_secret_test" }),
      );

      assertEquals(getPublishableKey(), "sb_publishable_test");
      assertEquals(getServiceRoleKey(), "sb_secret_test");
    });
  },
});

Deno.test({
  name: "key resolver honors an explicitly selected named key",
  sanitizeResources: false,
  sanitizeOps: false,
  fn() {
    withCleanKeyEnvironment(() => {
      Deno.env.set(
        "SUPABASE_SECRET_KEYS",
        JSON.stringify({
          default: "sb_secret_default",
          wall_feed: "sb_secret_wall_feed",
        }),
      );
      Deno.env.set("SUPABASE_SECRET_KEY_NAME", "wall_feed");

      assertEquals(getServiceRoleKey(), "sb_secret_wall_feed");
    });
  },
});
