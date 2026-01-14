import path from "path";
import dotenv from "dotenv";

/**
 * Env contract reuse:
 * Root is authoritative: SUPABASE_URL + SUPABASE_PUBLISHABLE_KEY
 * Web requires NEXT_PUBLIC_ vars; we map them without forking the contract.
 */
const rootEnvLocal = path.resolve(process.cwd(), "../../.env.local");
const rootEnv = path.resolve(process.cwd(), "../../.env");

dotenv.config({ path: rootEnvLocal });
dotenv.config({ path: rootEnv });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnon = process.env.SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseAnon) {
  throw new Error(
    "Missing SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY. Ensure root .env.local (or .env) is present and populated.",
  );
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseAnon,
  },
};

export default nextConfig;
