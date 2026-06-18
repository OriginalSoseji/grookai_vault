import type { Metadata } from "next";
import Link from "next/link";
import PageContainer from "@/components/layout/PageContainer";
import PageIntro from "@/components/layout/PageIntro";
import PageSection from "@/components/layout/PageSection";
import SectionHeader from "@/components/layout/SectionHeader";
import { WarehouseBadge } from "@/components/founder/WarehouseReviewPrimitives";
import { requireFounderAccess } from "@/lib/founder/requireFounderAccess";
import { createServerAdminClient } from "@/lib/supabase/admin";
import { resolveDatabaseGrookaiUserEntitlement } from "@/lib/entitlements/grookaiUserEntitlements";
import {
  saveFounderEntitlementAction,
  setFounderEntitlementActiveAction,
} from "./actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata: Metadata = {
  title: "Founder User Entitlements",
  robots: {
    index: false,
    follow: false,
  },
};

const TIER_OPTIONS = [
  { value: "free", label: "Free" },
  { value: "premium", label: "Premium" },
  { value: "vendor", label: "Vendor" },
  { value: "founder_admin", label: "Founder Admin" },
] as const;

const ROLE_OPTIONS = [
  { value: "collector", label: "Collector" },
  { value: "subscriber", label: "Subscriber" },
  { value: "vendor", label: "Vendor" },
  { value: "founder", label: "Founder" },
  { value: "internal", label: "Internal" },
] as const;

const FEATURE_OPTIONS = [
  { key: "assistant", label: "Grookai Assistant" },
  { key: "vendor_tools", label: "Vendor tools" },
  { key: "founder_tools", label: "Founder tools" },
  { key: "grookai_intelligence", label: "Grookai Intelligence" },
  { key: "internal_debug", label: "Internal debug" },
  { key: "catalog_audits", label: "Catalog audits" },
] as const;

type EntitlementRow = {
  id: string;
  user_id: string | null;
  email: string | null;
  tier: string | null;
  role: string | null;
  features: Record<string, unknown> | null;
  is_active: boolean | null;
  source: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
};

function formatTimestamp(value: string | null) {
  if (!value) {
    return "—";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function normalizeFeatureMap(value: Record<string, unknown> | null | undefined): Record<string, boolean> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(([, featureValue]) => typeof featureValue === "boolean")
      .map(([key, featureValue]) => [key, featureValue as boolean]),
  );
}

function featureEnabled(features: Record<string, boolean>, key: string) {
  return features[key] === true;
}

function tierTone(tier: string | null | undefined): "default" | "success" | "warning" | "danger" | "muted" {
  if (tier === "founder_admin") return "danger";
  if (tier === "vendor") return "warning";
  if (tier === "premium") return "success";
  if (tier === "free") return "muted";
  return "default";
}

function statusMessage(searchParams?: { status?: string; message?: string }) {
  const status = searchParams?.status;
  const message = searchParams?.message;
  if (!status || !message) {
    return null;
  }

  return {
    tone: status === "error" ? "error" : "saved",
    message,
  };
}

function EntitlementSelect({
  name,
  defaultValue,
  options,
}: {
  name: string;
  defaultValue: string;
  options: ReadonlyArray<{ value: string; label: string }>;
}) {
  return (
    <select
      className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
      defaultValue={defaultValue}
      name={name}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function FeatureCheckbox({
  featureKey,
  label,
  defaultChecked,
}: {
  featureKey: string;
  label: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
      <input type="hidden" name={`feature_${featureKey}`} value="off" />
      <input
        className="h-4 w-4 rounded border-slate-300 text-slate-950"
        defaultChecked={defaultChecked}
        name={`feature_${featureKey}`}
        type="checkbox"
      />
      <span>{label}</span>
    </label>
  );
}

function SummaryMetric({ label, value, detail }: { label: string; value: string | number; detail?: string }) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white px-4 py-4 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{value}</p>
      {detail ? <p className="mt-1 text-xs text-slate-600">{detail}</p> : null}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-sm text-slate-600">
      {message}
    </div>
  );
}

export default async function FounderEntitlementsPage({
  searchParams,
}: {
  searchParams?: { status?: string; message?: string };
}) {
  await requireFounderAccess("/founder/entitlements");
  const admin = createServerAdminClient();
  const notice = statusMessage(searchParams);
  let rows: EntitlementRow[] = [];
  let loadError: string | null = null;

  const { data, error } = await admin
    .from("user_entitlements")
    .select("id,user_id,email,tier,role,features,is_active,source,notes,created_at,updated_at")
    .order("is_active", { ascending: false })
    .order("tier", { ascending: false })
    .order("email", { ascending: true });

  if (error) {
    loadError = error.message;
  } else {
    rows = (data ?? []) as EntitlementRow[];
  }

  const activeRows = rows.filter((row) => row.is_active !== false);
  const activeByTier = new Map<string, number>();
  for (const row of activeRows) {
    const tier = row.tier ?? "unknown";
    activeByTier.set(tier, (activeByTier.get(tier) ?? 0) + 1);
  }

  return (
    <PageContainer className="space-y-8 py-8">
      <PageIntro
        eyebrow="Founder Access"
        title="User Entitlements"
        description="Manage Grookai access tiers from one governed place. This controls Premium, Vendor, Founder, Assistant, and Intelligence access without scattered allowlists."
        actions={(
          <div className="flex flex-wrap gap-3">
            <Link
              href="/founder"
              className="rounded-full border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Founder Home
            </Link>
            <Link
              href="/founder/warehouse"
              className="rounded-full border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Warehouse
            </Link>
          </div>
        )}
      />

      {notice ? (
        <div
          className={
            notice.tone === "error"
              ? "rounded-[1.5rem] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700"
              : "rounded-[1.5rem] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700"
          }
        >
          {notice.message}
        </div>
      ) : null}

      <PageSection surface="card" spacing="default">
        <SectionHeader
          title="Access levels"
          description="Tiers grant baseline capabilities. Feature flags can add explicit capabilities for individual users."
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryMetric
            label="Free"
            value={activeByTier.get("free") ?? 0}
            detail="Natural-language search and standard collector access."
          />
          <SummaryMetric
            label="Premium"
            value={activeByTier.get("premium") ?? 0}
            detail="Assistant-capable subscriber tier."
          />
          <SummaryMetric
            label="Vendor"
            value={activeByTier.get("vendor") ?? 0}
            detail="Grookai Intelligence and vendor tools."
          />
          <SummaryMetric
            label="Founder Admin"
            value={activeByTier.get("founder_admin") ?? 0}
            detail="Full internal tools and catalog audit authority."
          />
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
          `ccabrl@gmail.com` is also protected by the emergency founder fallback in code. The table row is still useful for visibility and future portability.
        </div>
      </PageSection>

      <PageSection surface="card" spacing="default">
        <SectionHeader
          title="Create entitlement"
          description="Create a managed access row by email or Supabase user id. New rows receive sensible default feature flags from the selected tier."
        />
        <form action={saveFounderEntitlementAction} className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_180px_180px] lg:items-end">
          <label className="space-y-2 text-sm text-slate-700">
            <span className="font-medium">Email</span>
            <input
              className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
              name="email"
              placeholder="person@example.com"
              type="email"
            />
          </label>
          <label className="space-y-2 text-sm text-slate-700">
            <span className="font-medium">User ID</span>
            <input
              className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
              name="user_id"
              placeholder="Optional Supabase user id"
            />
          </label>
          <label className="space-y-2 text-sm text-slate-700">
            <span className="font-medium">Tier</span>
            <EntitlementSelect name="tier" defaultValue="premium" options={TIER_OPTIONS} />
          </label>
          <label className="space-y-2 text-sm text-slate-700">
            <span className="font-medium">Role</span>
            <EntitlementSelect name="role" defaultValue="subscriber" options={ROLE_OPTIONS} />
          </label>
          <label className="space-y-2 text-sm text-slate-700 lg:col-span-3">
            <span className="font-medium">Notes</span>
            <input
              className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
              name="notes"
              placeholder="Optional reason or customer context"
            />
          </label>
          <button
            className="rounded-full bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
            type="submit"
          >
            Create entitlement
          </button>
        </form>
      </PageSection>

      <PageSection spacing="default">
        <SectionHeader
          title={`Managed users (${rows.length})`}
          description="Edit tiers, roles, capability flags, and activation state. Deactivation is preferred over deletion so access history remains inspectable."
        />

        {loadError ? (
          <div className="rounded-[1.75rem] border border-rose-200 bg-rose-50 px-6 py-6 text-sm leading-7 text-rose-700">
            Could not load `public.user_entitlements`: {loadError}. Apply the entitlement migration before using this page.
          </div>
        ) : rows.length === 0 ? (
          <EmptyState message="No entitlement rows exist yet. Create one above after the migration is applied." />
        ) : (
          <div className="space-y-4">
            {rows.map((row) => {
              const features = normalizeFeatureMap(row.features);
              const entitlement = resolveDatabaseGrookaiUserEntitlement({
                user: {
                  id: row.user_id ?? "",
                  email: row.email ?? "",
                },
                record: row,
              });
              const capabilities = entitlement?.capabilities;

              return (
                <article
                  key={row.id}
                  className="rounded-[1.75rem] border border-slate-200 bg-white px-5 py-5 shadow-sm"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 space-y-3">
                      <div className="flex flex-wrap gap-2">
                        <WarehouseBadge value={row.tier ?? "unknown"} tone={tierTone(row.tier)} />
                        <WarehouseBadge value={row.role ?? "unknown"} />
                        <WarehouseBadge value={row.is_active === false ? "inactive" : "active"} tone={row.is_active === false ? "muted" : "success"} />
                        <WarehouseBadge value={row.source ?? "unknown source"} />
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold tracking-tight text-slate-950">{row.email ?? "No email"}</h2>
                        <p className="mt-1 break-all text-sm text-slate-500">{row.user_id ?? "No user id assigned"}</p>
                      </div>
                    </div>
                    <div className="shrink-0 text-sm text-slate-500">
                      <p>Created {formatTimestamp(row.created_at)}</p>
                      <p>Updated {formatTimestamp(row.updated_at)}</p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
                    <form action={saveFounderEntitlementAction} className="space-y-4 rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4">
                      <input type="hidden" name="id" value={row.id} />
                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="space-y-2 text-sm text-slate-700">
                          <span className="font-medium">Email</span>
                          <input
                            className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
                            defaultValue={row.email ?? ""}
                            name="email"
                            type="email"
                          />
                        </label>
                        <label className="space-y-2 text-sm text-slate-700">
                          <span className="font-medium">User ID</span>
                          <input
                            className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
                            defaultValue={row.user_id ?? ""}
                            name="user_id"
                          />
                        </label>
                        <label className="space-y-2 text-sm text-slate-700">
                          <span className="font-medium">Tier</span>
                          <EntitlementSelect name="tier" defaultValue={row.tier ?? "free"} options={TIER_OPTIONS} />
                        </label>
                        <label className="space-y-2 text-sm text-slate-700">
                          <span className="font-medium">Role</span>
                          <EntitlementSelect name="role" defaultValue={row.role ?? "collector"} options={ROLE_OPTIONS} />
                        </label>
                      </div>

                      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                        {FEATURE_OPTIONS.map((feature) => (
                          <FeatureCheckbox
                            key={feature.key}
                            featureKey={feature.key}
                            label={feature.label}
                            defaultChecked={featureEnabled(features, feature.key)}
                          />
                        ))}
                      </div>

                      <label className="space-y-2 text-sm text-slate-700">
                        <span className="font-medium">Notes</span>
                        <textarea
                          className="min-h-20 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
                          defaultValue={row.notes ?? ""}
                          name="notes"
                        />
                      </label>

                      <label className="flex items-center gap-2 text-sm text-slate-700">
                        <input type="hidden" name="is_active" value="off" />
                        <input
                          className="h-4 w-4 rounded border-slate-300 text-slate-950"
                          defaultChecked={row.is_active !== false}
                          name="is_active"
                          type="checkbox"
                        />
                        <span>Active entitlement</span>
                      </label>

                      <button
                        className="rounded-full bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
                        type="submit"
                      >
                        Save changes
                      </button>
                    </form>

                    <div className="space-y-4">
                      <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4">
                        <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Effective capability preview</h3>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {[
                            ["Search", capabilities?.canUseSearch],
                            ["Assistant", capabilities?.canUseAssistant],
                            ["Vendor tools", capabilities?.canUseVendorTools],
                            ["Founder tools", capabilities?.canUseFounderTools],
                            ["Intelligence", capabilities?.canUseGrookaiIntelligence],
                            ["Debug", capabilities?.canViewInternalDebug],
                            ["Audits", capabilities?.canRunCatalogAudits],
                          ].map(([label, enabled]) => (
                            <WarehouseBadge key={String(label)} value={label} tone={enabled ? "success" : "muted"} />
                          ))}
                        </div>
                      </div>

                      <form action={setFounderEntitlementActiveAction} className="rounded-[1.5rem] border border-slate-200 bg-white px-4 py-4">
                        <input type="hidden" name="id" value={row.id} />
                        <input type="hidden" name="is_active" value={row.is_active === false ? "true" : "false"} />
                        <button
                          className={
                            row.is_active === false
                              ? "rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100"
                              : "rounded-full border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700 transition hover:bg-rose-100"
                          }
                          type="submit"
                        >
                          {row.is_active === false ? "Reactivate entitlement" : "Deactivate entitlement"}
                        </button>
                        <p className="mt-3 text-xs leading-5 text-slate-500">
                          No hard delete is provided here. Use inactive rows to preserve operator history.
                        </p>
                      </form>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </PageSection>
    </PageContainer>
  );
}
