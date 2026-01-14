/**
 * RLS probe for vault views.
 * Reads env from root (.env.local -> .env) to avoid duplicating secrets.
 * Usage: npm run rls:probe
 */
import path from "path";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

const rootEnvLocal = path.resolve(process.cwd(), "../../.env.local");
const rootEnv = path.resolve(process.cwd(), "../../.env");
dotenv.config({ path: rootEnvLocal });
dotenv.config({ path: rootEnv });

const url = process.env.SUPABASE_URL;
const anon = process.env.SUPABASE_PUBLISHABLE_KEY;
const email = process.env.SUPABASE_TEST_EMAIL;
const password = process.env.SUPABASE_TEST_PASSWORD;

if (!url || !anon) {
  console.error("Missing SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY in root env. Aborting probe.");
  process.exit(1);
}

if (!email || !password) {
  console.error(
    "Missing SUPABASE_TEST_EMAIL or SUPABASE_TEST_PASSWORD. Set them temporarily in your shell to run this probe.",
  );
  process.exit(1);
}

const supabase = createClient(url, anon);

async function main() {
  const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
  if (authError) {
    console.error("Auth failed:", authError.message);
    process.exit(1);
  }

  const tryView = async (view) => {
    const { data, error } = await supabase.from(view).select("*").limit(1);
    if (error) {
      console.log(`[RLS_PROBE] ${view}: ERROR -> ${error.message}`);
    } else {
      console.log(`[RLS_PROBE] ${view}: OK (${data?.length ?? 0} rows visible)`);
    }
    return !error;
  };

  const extOk = await tryView("v_vault_items_ext");
  if (!extOk) {
    await tryView("v_vault_items");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
