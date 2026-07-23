import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import PageIntro from "@/components/layout/PageIntro";
import PageSection from "@/components/layout/PageSection";
import { CreateBinderForm } from "@/components/binders/BinderForms";
import { BinderIdempotencyScope } from "@/components/binders/BinderIdempotencyScope";
import { BinderConnectivityBoundary } from "@/components/binders/BinderOfflineBanner";
import { requireServerUser } from "@/lib/auth/requireServerUser";
import {
  getBinderFeatureFlags,
  isBinderLibraryEnabled,
} from "@/lib/binders/featureFlags";
import {
  getBinderSetOptions,
  getBinderSpeciesOptions,
} from "@/lib/binders/speciesOptions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Create Binder | Grookai Vault",
  robots: { index: false, follow: false },
};

export default async function NewBinderPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  if (!isBinderLibraryEnabled()) {
    notFound();
  }
  const { supabase } = await requireServerUser("/binders/new");
  const flags = getBinderFeatureFlags();
  const speciesSearch = typeof searchParams.q === "string" ? searchParams.q.trim().slice(0, 60) : "";
  const [speciesOptions, setOptions] = await Promise.all([
    getBinderSpeciesOptions(supabase, speciesSearch),
    flags.setBinders
      ? getBinderSetOptions(supabase, speciesSearch)
      : Promise.resolve([]),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-8 py-6">
      <PageIntro
        eyebrow="Binders"
        title="Create Binder"
        description="Start a collection goal using card prints you already own—or want to find."
        actions={
          <Link href="/binders" className="gv-secondary-button">
            Cancel
          </Link>
        }
      />
      <PageSection surface="subtle">
        <form method="get" action="/binders/new" className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="block flex-1 text-sm font-medium text-slate-700">
            Find a Pokémon or set
            <input
              type="search"
              name="q"
              maxLength={60}
              defaultValue={speciesSearch}
              placeholder="Pikachu or Base Set"
              className="mt-1.5 min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-emerald-300"
            />
          </label>
          <button type="submit" className="gv-secondary-button">Search</button>
        </form>
      </PageSection>
      <PageSection surface="card" spacing="loose">
        <BinderConnectivityBoundary loadedAt={new Date().toISOString()}>
          <BinderIdempotencyScope seed={crypto.randomUUID()}>
            <CreateBinderForm
              speciesOptions={speciesOptions}
              setOptions={setOptions}
              setBindersEnabled={flags.setBinders}
              customBindersEnabled={flags.customBinders}
            />
          </BinderIdempotencyScope>
        </BinderConnectivityBoundary>
      </PageSection>
      <PageSection surface="subtle">
        <h2 className="text-base font-semibold text-slate-950">How Binders work</h2>
        <p className="text-sm text-slate-600">
          Cards stay in each collector&apos;s Vault. The Binder combines only the exact copies members choose to contribute.
        </p>
      </PageSection>
    </div>
  );
}
