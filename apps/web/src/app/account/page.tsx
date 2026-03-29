import Link from "next/link";
import { redirect } from "next/navigation";
import { PublicProfileSettingsForm } from "@/components/account/PublicProfileSettingsForm";
import type { PublicProfileSettingsValues } from "@/lib/publicProfileSettings";
import { createServerComponentClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PublicProfileRow = {
  slug: string | null;
  display_name: string | null;
  public_profile_enabled: boolean | null;
  vault_sharing_enabled: boolean | null;
  avatar_path: string | null;
  banner_path: string | null;
};

export default async function AccountPage() {
  const supabase = createServerComponentClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/account");
  }

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

  return (
    <div className="space-y-8 py-8">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Profile</p>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-950">Your Grookai profile</h1>
          <p className="max-w-2xl text-base leading-7 text-slate-600">
            Manage your Grookai identity, public page, and account settings here.
          </p>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold tracking-tight text-slate-950">Signed in</h2>
          <p className="mt-3 text-sm text-slate-600">Email</p>
          <p className="mt-1 text-base font-medium text-slate-900">{user.email ?? "Email unavailable"}</p>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Quick Links</h2>
          <div className="mt-4 flex flex-col gap-3">
            <Link
              href="/vault"
              className="rounded-full bg-slate-950 px-5 py-2.5 text-center text-sm font-medium text-white transition hover:bg-slate-800"
            >
              View Vault
            </Link>
            <Link
              href="/wall"
              className="rounded-full border border-slate-300 px-5 py-2.5 text-center text-sm font-medium text-slate-700 transition hover:bg-white"
            >
              View Wall
            </Link>
            <Link
              href="/network"
              className="rounded-full border border-slate-300 px-5 py-2.5 text-center text-sm font-medium text-slate-700 transition hover:bg-white"
            >
              Browse Network
            </Link>
            <Link
              href="/network/inbox"
              className="rounded-full border border-slate-300 px-5 py-2.5 text-center text-sm font-medium text-slate-700 transition hover:bg-white"
            >
              Messages
            </Link>
            <Link
              href="/submit"
              className="rounded-full border border-slate-300 px-5 py-2.5 text-center text-sm font-medium text-slate-700 transition hover:bg-white"
            >
              Submit Missing Card
            </Link>
            <Link
              href="/following"
              className="rounded-full border border-slate-300 px-5 py-2.5 text-center text-sm font-medium text-slate-700 transition hover:bg-white"
            >
              Following
            </Link>
          </div>
        </div>
      </section>

      <PublicProfileSettingsForm
        initialValues={initialProfileValues}
        hasExistingProfile={Boolean(profileRow)}
        userId={user.id}
        loadError={profileError?.message ?? null}
      />

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
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

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
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
          </div>
        </div>
      </section>
    </div>
  );
}
