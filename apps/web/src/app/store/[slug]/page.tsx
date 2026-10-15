import type { Metadata } from "next";
import { cache } from "react";
import { acquisitionAvailable } from "@/lib/orders/orderAcquisitionRuntime";
import { notFound, redirect } from "next/navigation";
import { createServerComponentClient } from "@/lib/supabase/server";
import { buildLoginHref } from "@/lib/auth/routeAccess";
import { readStorefront } from "@/lib/stores/storefrontServer";
import { storeFilters } from "@/lib/stores/storefrontTypes";
import { StorefrontView } from "@/components/stores/StorefrontView";
import { StoreEntry } from "@/components/stores/StoreEntry";
import { getSiteOrigin } from "@/lib/getSiteOrigin";
import type { StoreSurface } from "@/lib/stores/storefrontTypes";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const readStorefrontCached = cache(
  async (
    slug: string,
    surface: StoreSurface,
    query = "",
    sectionId = "",
    condition = "",
    kind = "all",
    offset = 0,
  ) =>
    readStorefront(slug, surface, {
      query: query || undefined,
      sectionId: sectionId || undefined,
      condition: condition || undefined,
      kind,
      offset,
    }),
);

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const { slug } = await params;
  const search = await searchParams;
  const isPreview = search.preview === "1";
  if (isPreview) {
    return { title: "Store preview | Grookai Vault", robots: { index: false, follow: false } };
  }

  const data = await readStorefrontCached(slug, "web");
  if (!data) return { title: "Store not found | Grookai Vault", robots: { index: false, follow: false } };

  const title = `${data.store.display_name} · Grookai Vault Store`;
  const description = data.store.description?.trim() || `Browse collectibles from ${data.store.display_name} on Grookai Vault.`;
  const canonical = `/store/${encodeURIComponent(data.store.slug)}`;
  const image = data.store.has_banner
    ? `${getSiteOrigin()}/api/stores/${encodeURIComponent(data.store.slug)}/media/banner`
    : undefined;
  return {
    title,
    description,
    robots: { index: true, follow: true },
    alternates: { canonical },
    openGraph: { title, description, type: "website", url: canonical, images: image ? [{ url: image, alt: `${data.store.display_name} store banner` }] : undefined },
    twitter: { card: "summary_large_image", title, description, images: image ? [image] : undefined },
  };
}
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
  const data = await readStorefrontCached(
    slug,
    preview ? "preview" : "web",
    filters.query,
    filters.sectionId,
    filters.condition,
    filters.kind,
    filters.offset,
  );
  if (!data) notFound();
  return (
    <>
      {!preview && <StoreEntry slug={slug} />}
      <StorefrontView data={data} filters={filters} purchaseEnabled={!preview && acquisitionAvailable()} />
    </>
  );
}
