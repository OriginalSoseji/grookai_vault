import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import SignOutButton from "@/components/account/SignOutButton";
import { PublicProfileSettingsForm } from "@/components/account/PublicProfileSettingsForm";
import { WallSectionsSettingsCard } from "@/components/account/WallSectionsSettingsCard";
import FounderMarketSignalsSection from "@/components/founder/FounderMarketSignalsSection";
import { requireServerUser } from "@/lib/auth/requireServerUser";
import {
  getFounderMarketSignals,
  type FounderInsightBundle,
} from "@/lib/founder/getFounderMarketSignals";
import { resolveServerUserEntitlement } from "@/lib/entitlements/resolveServerUserEntitlement";
import type { PublicProfileSettingsValues } from "@/lib/publicProfileSettings";
import { createServerAdminClient } from "@/lib/supabase/admin";
import { getOwnerWallSections } from "@/lib/wallSections/getOwnerWallSections";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type AccountTab = "profile" | "vendor-tools";

type PublicProfileRow = {
  slug: string | null;
  display_name: string | null;
  public_profile_enabled: boolean | null;
  vault_sharing_enabled: boolean | null;
  avatar_path: string | null;
  banner_path: string | null;
};

type AccountPageProps = {
  searchParams?: Promise<{
    tab?: string | string[];
  }>;
};

const ACCOUNT_LINK_GROUPS = [
  {
    label: "Collection",
    links: [
      { href: "/vault", label: "View Vault", primary: true },
      { href: "/wall", label: "View Wall", primary: false },
      { href: "/following", label: "Following", primary: false },
      { href: "/submit", label: "Submit missing card", primary: false },
    ],
  },
  {
    label: "Store",
    links: [
      { href: "/account/store", label: "Manage store", primary: true },
      { href: "/account/orders", label: "Your purchases", primary: false },
      { href: "/account/store/orders", label: "Store orders", primary: false },
    ],
  },
  {
    label: "Community",
    links: [
      { href: "/network", label: "Browse network", primary: false },
      { href: "/network/inbox", label: "Messages", primary: false },
      { href: "/support", label: "Support", primary: false },
      { href: "/privacy", label: "Privacy", primary: false },
    ],
  },
] as const;

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function normalizeTabParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? undefined;
  }
  return value;
}

function resolveAccountTab(
  requestedTab: string | undefined,
  showFounderSignals: boolean,
): AccountTab {
  if (showFounderSignals && requestedTab === "vendor-tools") {
    return "vendor-tools";
  }

  return "profile";
}

function getAccountTabHref(tab: AccountTab) {
  return `/account?tab=${encodeURIComponent(tab)}`;
}

export default async function AccountPage(props: AccountPageProps) {
  const searchParams = await props.searchParams;
  const { supabase, user } = await requireServerUser("/account");

  const { data: profile, error: profileError } = await supabase
    .from("public_profiles")
    .select("slug,display_name,public_profile_enabled,vault_sharing_enabled,avatar_path,banner_path")
    .eq("user_id", user.id)
    .maybeSingle();

  const profileRow = (profile ?? null) as PublicProfileRow | null;
  const initialProfileValues: PublicProfileSettingsValues = {
    slug: profileRow?.slug ?? "",
    displayName: profileRow?.display_name ?? "",
    publicProfileEnabled: Boolean(profileRow?.public_profile_enabled),
    vaultSharingEnabled: Boolean(profileRow?.vault_sharing_enabled),
    avatarPath: profileRow?.avatar_path ?? null,
    bannerPath: profileRow?.banner_path ?? null,
  };
  const publicProfileSlug =
    initialProfileValues.publicProfileEnabled && initialProfileValues.vaultSharingEnabled && initialProfileValues.slug
      ? initialProfileValues.slug
      : null;
  const entitlement = await resolveServerUserEntitlement(user);
  const showFounderSignals = entitlement.capabilities.canUseVendorTools;
  const wallSectionsModel = await getOwnerWallSections(user.id);
  const activeTab = resolveAccountTab(
    normalizeTabParam(searchParams?.tab),
    showFounderSignals,
  );
  const tabOptions: Array<{ value: AccountTab; label: string; href: string }> = [
    {
      value: "profile",
      label: "Profile",
      href: getAccountTabHref("profile"),
    },
    ...(showFounderSignals
      ? [
          {
            value: "vendor-tools" as const,
            label: "Vendor Tools",
            href: getAccountTabHref("vendor-tools"),
          },
        ]
      : []),
  ];
  let founderSignals: FounderInsightBundle | null = null;
  let founderSignalsError = false;

  if (showFounderSignals && activeTab === "vendor-tools") {
    try {
      const admin = createServerAdminClient();
      founderSignals = await getFounderMarketSignals(admin);
    } catch {
      founderSignalsError = true;
    }
  }

  return (
    <div className="gv-account-page mx-auto max-w-[1170px] space-y-8 py-5 sm:py-9">
      <section className="gv-account-hero border-b border-slate-200 pb-6 dark:border-white/[0.08]">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="min-w-0 space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Account</p>
            <h1 className="text-4xl font-semibold tracking-tight text-slate-950">Your Grookai profile</h1>
            <p className="max-w-2xl text-base leading-7 text-slate-600">
              Manage your Grookai identity, public page, and account settings here.
            </p>
          </div>
          <SignOutButton />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="gv-account-card rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="text-xl font-semibold tracking-tight text-slate-950">Signed in</h2>
          <p className="mt-3 text-sm text-slate-600">Email</p>
          <p className="mt-1 text-base font-medium text-slate-900">{user.email ?? "Email unavailable"}</p>
        </div>

        <div className="gv-account-card gv-account-links-card rounded-lg border border-slate-200 bg-slate-50 p-6">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Quick links</h2>
            <p className="text-sm leading-6 text-slate-600">Jump back into the parts of Grookai you use most.</p>
          </div>
          <div className="gv-account-links-grid mt-5">
            {ACCOUNT_LINK_GROUPS.map((group) => (
              <section key={group.label} className="gv-account-link-group" aria-labelledby={`account-links-${group.label.toLowerCase()}`}>
                <h3 id={`account-links-${group.label.toLowerCase()}`} className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  {group.label}
                </h3>
                <div className="mt-2 space-y-2">
                  {group.links.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`gv-account-link ${link.primary ? "gv-account-link-primary" : ""}`}
                    >
                      <span>{link.label}</span>
                      <ArrowUpRight size={16} aria-hidden="true" />
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </section>

      <section className="gv-account-tabs border-y border-slate-200 py-2 dark:border-white/[0.08]">
        <nav aria-label="Account sections" className="flex flex-wrap gap-2">
          {tabOptions.map((option) => {
            const active = option.value === activeTab;
            return (
              <Link
                key={option.value}
                href={option.href}
                className={cx(
                  "min-w-0 flex-1 rounded-full px-4 py-2.5 text-center text-sm font-medium transition sm:flex-none",
                  active
                    ? "bg-slate-950 text-white shadow-sm"
                    : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900",
                )}
                aria-current={active ? "page" : undefined}
              >
                {option.label}
              </Link>
            );
          })}
        </nav>
      </section>

      {activeTab === "profile" ? (
        <>
          <PublicProfileSettingsForm
            initialValues={initialProfileValues}
            hasExistingProfile={Boolean(profileRow)}
            userId={user.id}
            loadError={profileError ? "Profile settings could not load. Your existing profile was not changed." : null}
          />

          <WallSectionsSettingsCard initialModel={wallSectionsModel} publicProfileSlug={publicProfileSlug} />

          <section className="gv-account-card rounded-lg border border-slate-200 bg-white p-6">
            <div className="space-y-4">
              <div className="space-y-1">
                <h2 className="text-xl font-semibold tracking-tight text-slate-950">Community</h2>
                <p className="max-w-2xl text-sm leading-7 text-slate-600">
                  Join the Grookai collector community. Discuss cards, report data issues, and help shape Grookai.
                </p>
              </div>

              <div>
                <a
                  href="https://discord.gg/Cqax8URsM3"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
                >
                  <span>Join Grookai Discord</span>
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 16 16"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M6 4h6v6" />
                    <path d="M10.5 5.5 4.5 11.5" />
                  </svg>
                </a>
              </div>
            </div>
          </section>

          <section className="gv-account-card rounded-lg border border-slate-200 bg-white p-6">
            <div className="space-y-4">
              <div className="space-y-1">
                <h2 className="text-xl font-semibold tracking-tight text-slate-950">Collection Tools</h2>
                <p className="text-sm leading-7 text-slate-600">Bring your collection into Grookai from a supported export.</p>
              </div>

              <div>
                <Link
                  href="/vault/import"
                  className="inline-flex rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
                >
                  Import Collection
                </Link>
                <Link href="/saved" className="gv-secondary-button ml-3">Saved cards</Link>
              </div>
            </div>
          </section>
        </>
      ) : (
        <section className="gv-account-card rounded-lg border border-slate-200 bg-white p-6">
          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              Vendor Tools
            </p>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
              Founder Signals
            </h2>
            <p className="max-w-3xl text-sm leading-7 text-slate-600">
              Private founder market signals built from live collector behavior.
            </p>
          </div>

          {founderSignalsError ? (
            <div className="mt-6 rounded-lg border border-rose-200 bg-rose-50 px-4 py-4 text-sm leading-7 text-rose-700">
              Founder Signals are unavailable right now. No account or market data was changed.
            </div>
          ) : founderSignals ? (
            <div className="mt-6">
              <FounderMarketSignalsSection
                insights={founderSignals}
                showHeader={false}
              />
            </div>
          ) : (
            <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-600">
              Founder Signals will appear here once the aggregated market
              insight service is available.
            </div>
          )}
        </section>
      )}
    </div>
  );
}
