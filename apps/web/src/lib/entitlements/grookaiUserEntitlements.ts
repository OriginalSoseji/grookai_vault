import type { User } from "@supabase/supabase-js";

export const GROOKAI_ENTITLEMENT_VERSION = "GROOKAI_USER_ENTITLEMENTS_V1";

export type GrookaiUserTier =
  | "anonymous"
  | "free"
  | "premium"
  | "vendor"
  | "founder_admin";

export type GrookaiUserRole =
  | "collector"
  | "subscriber"
  | "vendor"
  | "founder"
  | "internal";

export type GrookaiEntitlementSource =
  | "anonymous"
  | "default"
  | "database"
  | "env_founder_allowlist"
  | "env_vendor_allowlist"
  | "env_premium_allowlist";

export type GrookaiEntitlementRecord = {
  user_id?: string | null;
  email?: string | null;
  tier?: string | null;
  role?: string | null;
  features?: unknown;
  is_active?: boolean | null;
  source?: string | null;
  notes?: string | null;
};

type EntitlementUserInput = Pick<User, "email"> & Partial<Pick<User, "id">>;

export type GrookaiUserEntitlement = {
  version: typeof GROOKAI_ENTITLEMENT_VERSION;
  userId: string | null;
  email: string | null;
  tier: GrookaiUserTier;
  role: GrookaiUserRole;
  source: GrookaiEntitlementSource;
  features: Record<string, boolean>;
  capabilities: {
    canUseSearch: boolean;
    canUseAssistant: boolean;
    canUseVendorTools: boolean;
    canUseFounderTools: boolean;
    canUseGrookaiIntelligence: boolean;
    canViewInternalDebug: boolean;
    canRunCatalogAudits: boolean;
  };
  notes: string | null;
};

const DEFAULT_FOUNDER_ADMIN_EMAILS = ["ccabrl@gmail.com"];

function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function splitEnvList(value: string | undefined) {
  return new Set(
    (value ?? "")
      .split(",")
      .map((item) => normalizeEmail(item))
      .filter(Boolean),
  );
}

function resolveEmail(user: Pick<User, "email"> | null | undefined, record?: GrookaiEntitlementRecord | null) {
  return normalizeEmail(record?.email) || normalizeEmail(user?.email) || null;
}

function resolveTier(value: unknown): GrookaiUserTier {
  switch (value) {
    case "founder_admin":
      return "founder_admin";
    case "vendor":
    case "vendor_power_user":
      return "vendor";
    case "premium":
    case "paid_subscriber":
      return "premium";
    case "free":
    case "free_account":
      return "free";
    case "anonymous":
      return "anonymous";
    default:
      return "free";
  }
}

function defaultRoleForTier(tier: GrookaiUserTier): GrookaiUserRole {
  if (tier === "founder_admin") return "founder";
  if (tier === "vendor") return "vendor";
  if (tier === "premium") return "subscriber";
  return "collector";
}

function resolveRole(value: unknown, tier: GrookaiUserTier): GrookaiUserRole {
  switch (value) {
    case "founder":
    case "internal":
    case "vendor":
    case "subscriber":
    case "collector":
      return value;
    default:
      return defaultRoleForTier(tier);
  }
}

function normalizeFeatureMap(value: unknown): Record<string, boolean> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const entries: Array<[string, boolean]> = Object.entries(value as Record<string, unknown>)
    .filter(([, featureValue]) => typeof featureValue === "boolean")
    .map(([key, featureValue]) => [key, featureValue as boolean]);
  return Object.fromEntries(entries);
}

function buildCapabilities(tier: GrookaiUserTier, features: Record<string, boolean>) {
  const founder = tier === "founder_admin";
  const vendor = founder || tier === "vendor";
  const premium = vendor || tier === "premium";

  return {
    canUseSearch: tier !== "anonymous",
    canUseAssistant: premium || features.assistant === true,
    canUseVendorTools: vendor || features.vendor_tools === true,
    canUseFounderTools: founder || features.founder_tools === true,
    canUseGrookaiIntelligence: vendor || features.grookai_intelligence === true,
    canViewInternalDebug: founder || features.internal_debug === true,
    canRunCatalogAudits: founder || features.catalog_audits === true,
  };
}

function buildEntitlement(input: {
  user?: EntitlementUserInput | null;
  record?: GrookaiEntitlementRecord | null;
  tier: GrookaiUserTier;
  role?: GrookaiUserRole;
  source: GrookaiEntitlementSource;
  features?: Record<string, boolean>;
  notes?: string | null;
}): GrookaiUserEntitlement {
  const features = input.features ?? normalizeFeatureMap(input.record?.features);
  const role = input.role ?? resolveRole(input.record?.role, input.tier);

  return {
    version: GROOKAI_ENTITLEMENT_VERSION,
    userId: input.record?.user_id ?? input.user?.id ?? null,
    email: resolveEmail(input.user, input.record),
    tier: input.tier,
    role,
    source: input.source,
    features,
    capabilities: buildCapabilities(input.tier, features),
    notes: input.notes ?? input.record?.notes ?? null,
  };
}

export function resolveStaticGrookaiUserEntitlement(input: {
  user?: EntitlementUserInput | null;
  env?: NodeJS.ProcessEnv;
}): GrookaiUserEntitlement {
  const env = input.env ?? process.env;
  const email = normalizeEmail(input.user?.email);

  if (!input.user) {
    return buildEntitlement({
      user: null,
      tier: "anonymous",
      role: "collector",
      source: "anonymous",
      notes: "No signed-in user.",
    });
  }

  const founderEmails = splitEnvList(env.GROOKAI_FOUNDER_ADMIN_EMAILS ?? env.GROOKAI_ASSISTANT_FOUNDER_EMAILS);
  for (const founderEmail of DEFAULT_FOUNDER_ADMIN_EMAILS) {
    founderEmails.add(founderEmail);
  }

  if (email && founderEmails.has(email)) {
    return buildEntitlement({
      user: input.user,
      tier: "founder_admin",
      role: "founder",
      source: "env_founder_allowlist",
      features: {
        assistant: true,
        vendor_tools: true,
        founder_tools: true,
        grookai_intelligence: true,
        internal_debug: true,
        catalog_audits: true,
      },
      notes: "Emergency founder allowlist.",
    });
  }

  const vendorEmails = splitEnvList(env.GROOKAI_VENDOR_EMAILS ?? env.GROOKAI_INTELLIGENCE_VENDOR_EMAILS);
  if (email && vendorEmails.has(email)) {
    return buildEntitlement({
      user: input.user,
      tier: "vendor",
      role: "vendor",
      source: "env_vendor_allowlist",
      features: {
        assistant: true,
        vendor_tools: true,
        grookai_intelligence: true,
      },
      notes: "Environment vendor allowlist.",
    });
  }

  const premiumEmails = splitEnvList(env.GROOKAI_PREMIUM_EMAILS);
  if (email && premiumEmails.has(email)) {
    return buildEntitlement({
      user: input.user,
      tier: "premium",
      role: "subscriber",
      source: "env_premium_allowlist",
      features: {
        assistant: true,
      },
      notes: "Environment premium allowlist.",
    });
  }

  return buildEntitlement({
    user: input.user,
    tier: "free",
    role: "collector",
    source: "default",
    notes: "Default signed-in entitlement.",
  });
}

export function resolveDatabaseGrookaiUserEntitlement(input: {
  user: Pick<User, "id" | "email">;
  record: GrookaiEntitlementRecord | null | undefined;
}): GrookaiUserEntitlement | null {
  if (!input.record || input.record.is_active === false) {
    return null;
  }

  const tier = resolveTier(input.record.tier);
  return buildEntitlement({
    user: input.user,
    record: input.record,
    tier,
    source: "database",
  });
}
