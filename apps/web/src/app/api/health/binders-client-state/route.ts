import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function isExplicitlyEnabled(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === "true";
}

export function GET() {
  const webFlags = {
    GROOKAI_BINDERS_SCHEMA_RPC_V1_ENABLED: isExplicitlyEnabled(
      process.env.GROOKAI_BINDERS_SCHEMA_RPC_V1_ENABLED,
    ),
    GROOKAI_BINDERS_PERSONAL_V1_ENABLED: isExplicitlyEnabled(
      process.env.GROOKAI_BINDERS_PERSONAL_V1_ENABLED,
    ),
    GROOKAI_BINDERS_SHARED_V1_ENABLED: isExplicitlyEnabled(
      process.env.GROOKAI_BINDERS_SHARED_V1_ENABLED,
    ),
    GROOKAI_BINDERS_VIEW_LINKS_V1_ENABLED: isExplicitlyEnabled(
      process.env.GROOKAI_BINDERS_VIEW_LINKS_V1_ENABLED,
    ),
    GROOKAI_BINDERS_PUBLIC_V1_ENABLED: isExplicitlyEnabled(
      process.env.GROOKAI_BINDERS_PUBLIC_V1_ENABLED,
    ),
    GROOKAI_BINDERS_COMMUNITY_V1_ENABLED: isExplicitlyEnabled(
      process.env.GROOKAI_BINDERS_COMMUNITY_V1_ENABLED,
    ),
    GROOKAI_BINDERS_TEMPLATES_V1_ENABLED: isExplicitlyEnabled(
      process.env.GROOKAI_BINDERS_TEMPLATES_V1_ENABLED,
    ),
    GROOKAI_BINDERS_NOTIFICATIONS_V1_ENABLED: isExplicitlyEnabled(
      process.env.GROOKAI_BINDERS_NOTIFICATIONS_V1_ENABLED,
    ),
    GROOKAI_BINDERS_PULSE_SHARING_V1_ENABLED: isExplicitlyEnabled(
      process.env.GROOKAI_BINDERS_PULSE_SHARING_V1_ENABLED,
    ),
    GROOKAI_BINDERS_SET_V1_ENABLED: isExplicitlyEnabled(
      process.env.GROOKAI_BINDERS_SET_V1_ENABLED,
    ),
    GROOKAI_BINDERS_CUSTOM_V1_ENABLED: isExplicitlyEnabled(
      process.env.GROOKAI_BINDERS_CUSTOM_V1_ENABLED,
    ),
  };

  return NextResponse.json(
    {
      schema_version: 1,
      package_id: "COLLABORATIVE-BINDERS-CLIENTS-DARK-WEB-V1",
      production_origin: "https://grookaivault.com",
      deployment_id:
        process.env.VERCEL_DEPLOYMENT_ID ??
        process.env.VERCEL_URL ??
        "unavailable",
      deployment_commit_sha:
        process.env.VERCEL_GIT_COMMIT_SHA ??
        process.env.GIT_COMMIT_SHA ??
        "unavailable",
      release_proof_policies: {
        pricing_vault_sample: "fully_public_only_v1",
      },
      clients_dark: Object.values(webFlags).every(
        (enabled) => enabled === false,
      ),
      flags: webFlags,
      observed_at_utc: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
