import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createServerComponentClient } from "@/lib/supabase/server";
import { buildLoginHref } from "@/lib/auth/routeAccess";
import { readStorefront } from "@/lib/stores/storefrontServer";
import { storeFilters } from "@/lib/stores/storefrontTypes";
import { StorefrontView } from "@/components/stores/StorefrontView";
import { StoreEntry } from "@/components/stores/StoreEntry";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata: Metadata = {
  title: "Store | Grookai Vault",
  robots: { index: false, follow: false },
};
export default async function StorePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const search = await searchParams;
  const query = new URLSearchParams(
    Object.entries(search).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );
  const preview = query.get("preview") === "1";
  if (preview) {
    const client = await createServerComponentClient();
    if (!(await client.auth.getUser()).data.user)
      redirect(buildLoginHref(`/store/${encodeURIComponent(slug)}?${query}`));
  }
  let filters;
  try {
    filters = storeFilters(query);
  } catch {
    notFound();
  }
  const data = await readStorefront(slug, preview ? "preview" : "web", filters);
  if (!data) notFound();
  return (
    <>
      {!preview && <StoreEntry slug={slug} />}
      <StorefrontView data={data} filters={filters} />
    </>
  );
}
