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
const supabaseHost = supabaseUrl ? new URL(supabaseUrl).hostname : null;

// STABILIZATION RULE:
//
// Canonical env authority:
// - SUPABASE_URL
// - SUPABASE_PUBLISHABLE_KEY
// - SUPABASE_SECRET_KEY
// - BRIDGE_IMPORT_TOKEN
//
// Web compatibility alias:
// - NEXT_PUBLIC_SUPABASE_ANON_KEY
//
// SUPABASE_PUBLISHABLE_KEY is canonical.
// NEXT_PUBLIC_SUPABASE_ANON_KEY exists only as a web/framework compatibility alias.
// Do not introduce new env-name variants for the same secret.
//
// See: STABILIZATION_CONTRACT_V1.md

if (!supabaseUrl || !supabaseAnon) {
  throw new Error(
    "Missing SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY. Ensure root .env.local (or .env) is present and populated.",
  );
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: supabaseAnon,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseAnon,
  },
  async headers() {
    const shortPublicCache = "public, s-maxage=60, stale-while-revalidate=300";
    const mediumPublicCache = "public, s-maxage=120, stale-while-revalidate=600";
    const setPublicCache = "public, s-maxage=300, stale-while-revalidate=900";

    // LOCK: Public routes must not depend on global auth/session reads in the root chrome.
    // LOCK: Public read helpers should be cacheable by default.
    return [
      {
        source: "/",
        headers: [{ key: "Cache-Control", value: setPublicCache }],
      },
      {
        source: "/explore",
        headers: [{ key: "Cache-Control", value: mediumPublicCache }],
      },
      {
        source: "/network",
        headers: [{ key: "Cache-Control", value: shortPublicCache }],
      },
      {
        source: "/network/discover",
        headers: [{ key: "Cache-Control", value: shortPublicCache }],
      },
      {
        source: "/compare",
        headers: [{ key: "Cache-Control", value: mediumPublicCache }],
      },
      {
        source: "/card/:gv_id",
        headers: [{ key: "Cache-Control", value: mediumPublicCache }],
      },
      {
        source: "/gvvi/:gvvi_id",
        headers: [{ key: "Cache-Control", value: shortPublicCache }],
      },
      {
        source: "/u/:slug",
        headers: [{ key: "Cache-Control", value: shortPublicCache }],
      },
      {
        source: "/u/:slug/collection",
        headers: [{ key: "Cache-Control", value: shortPublicCache }],
      },
      {
        source: "/u/:slug/followers",
        headers: [{ key: "Cache-Control", value: shortPublicCache }],
      },
      {
        source: "/u/:slug/following",
        headers: [{ key: "Cache-Control", value: shortPublicCache }],
      },
      {
        source: "/u/:slug/pokemon/:pokemon",
        headers: [{ key: "Cache-Control", value: shortPublicCache }],
      },
      {
        source: "/u/:slug/section/:section_id",
        headers: [{ key: "Cache-Control", value: shortPublicCache }],
      },
      {
        source: "/sets",
        headers: [{ key: "Cache-Control", value: setPublicCache }],
      },
      {
        source: "/sets/:set_code",
        headers: [{ key: "Cache-Control", value: setPublicCache }],
      },
      {
        source: "/set/:set_code",
        headers: [{ key: "Cache-Control", value: setPublicCache }],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "assets.tcgdex.net",
      },
      {
        protocol: "https",
        hostname: "images.pokemontcg.io",
      },
      ...(supabaseHost
        ? [
            {
              protocol: "https",
              hostname: supabaseHost,
              pathname: "/storage/v1/object/public/**",
            },
            {
              protocol: "https",
              hostname: supabaseHost,
              pathname: "/storage/v1/object/sign/**",
            },
          ]
        : []),
    ],
  },
};

export default nextConfig;
