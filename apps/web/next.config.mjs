import path from "path";
import dotenv from "dotenv";

/**
 * Env contract reuse:
 * Root is authoritative: SUPABASE_URL + SUPABASE_PUBLISHABLE_KEY
 * Web requires NEXT_PUBLIC_ vars; we map them without forking the contract.
 */
const rootEnvLocal = path.resolve(process.cwd(), "../../.env.local");
const rootEnv = path.resolve(process.cwd(), "../../.env");
const repoRoot = path.resolve(process.cwd(), "../..");

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
  experimental: {
    cpus: 1,
    outputFileTracingRoot: repoRoot,
    outputFileTracingIncludes: {
      "/u/[slug]/opengraph-image": [
        "./public/grookai-logo-512.png",
      ],
      "/founder": [
        "../../docs/audits/founder_ops_dashboard_v1/*.json",
        "../../docs/audits/image_truth_v1/canon_image_full_db_playbook_scan_v1.json",
        "../../docs/audits/image_truth_v1/canon_image_unreferenced_storage_cleanup_plan_v1.json",
        "../../docs/audits/image_truth_v1/image_surface_consistency_scan_v1.json",
        "../../docs/audits/image_truth_v1/self_hosted_images_wh19a_final_image_hosting_state_scan_summary_v1.json",
        "../../docs/audits/new_set_release_ingestion_v1/20260714_abyss_eye_pitch_black/summary_v1.json",
        "../../docs/audits/english_master_index_completion_v1/english_master_index_completion_v1.json",
        "../../docs/audits/english_master_index_publishable_v1/english_master_index_publishable_manifest_v1.json",
        "../../docs/audits/market_evidence_engine_v1/mee_nightly_droplet_worker_v1_2026-07-13T19-27-52-230Z.json",
        "../../docs/audits/grookai_beta_hardening_readiness_v1/grookai_beta_hardening_readiness_v1.json",
        "../../docs/audits/app_flow_prod_readiness_v1/app_flow_prod_readiness_v1.json",
        "../../docs/audits/web_cohesion_link_integrity_v1/web_cohesion_link_integrity_v1.json",
        "../../docs/audits/release_hardening_v1/release_readiness_matrix_20260517.json",
        "../../docs/audits/supabase_security_linter_v1/supabase_security_warn_remediation_v2_20260521.md",
      ],
      "/api/review/visual-search/dashboard": [
        "./private/review/visual-search/**",
      ],
    },
  },
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
    // Card art is immutable once its canonical storage path is assigned. Keeping
    // optimized derivatives warm avoids repeated 500ms+ image optimizer misses.
    minimumCacheTTL: 60 * 60 * 24 * 7,
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [48, 64, 74, 96, 128, 160, 220, 320],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "assets.tcgdex.net",
      },
      {
        protocol: "https",
        hostname: "images.pokemontcg.io",
      },
      {
        protocol: "https",
        hostname: "raw.githubusercontent.com",
        pathname: "/PokeAPI/sprites/master/sprites/pokemon/**",
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
