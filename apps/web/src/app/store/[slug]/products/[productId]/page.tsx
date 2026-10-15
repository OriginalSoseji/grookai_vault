import { notFound, redirect } from "next/navigation";
import { acquisitionAvailable } from "@/lib/orders/orderAcquisitionRuntime";
import type { Metadata } from "next";
import { createServerComponentClient } from "@/lib/supabase/server";
import { buildLoginHref } from "@/lib/auth/routeAccess";
import { readCustomProduct } from "@/lib/stores/customProductServer";
import { CustomProductView } from "@/components/stores/CustomProductView";
import { StoreEntry } from "@/components/stores/StoreEntry";
import { getSiteOrigin } from "@/lib/getSiteOrigin";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; productId: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}): Promise<Metadata> {
  const { slug, productId } = await params;
  const isPreview = (await searchParams).preview === "1";
  if (isPreview) {
    return { title: "Collectible preview | Grookai Vault", robots: { index: false, follow: false } };
  }

  const data = await readCustomProduct(slug, productId, "web");
  if (!data) return { title: "Collectible not found | Grookai Vault", robots: { index: false, follow: false } };

  const title = `${data.product.title || "Collectible"} · ${data.store.display_name}`;
  const description = data.product.description?.trim() || `View this collectible from ${data.store.display_name} on Grookai Vault.`;
  const canonical = `/store/${encodeURIComponent(data.store.slug)}/products/${encodeURIComponent(data.product.id)}`;
  const image = data.product.photo_ids[0]
    ? `${getSiteOrigin()}/api/stores/${encodeURIComponent(data.store.slug)}/products/${encodeURIComponent(data.product.id)}/media/${encodeURIComponent(data.product.photo_ids[0])}`
    : undefined;
  return {
    title,
    description,
    robots: { index: true, follow: true },
    alternates: { canonical },
    openGraph: { title, description, type: "website", url: canonical, images: image ? [{ url: image, alt: data.product.title || "Collectible" }] : undefined },
    twitter: { card: image ? "summary_large_image" : "summary", title, description, images: image ? [image] : undefined },
  };
}
export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; productId: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { slug, productId } = await params;
  const preview = (await searchParams).preview === "1";
  if (
    preview &&
    !(await (await createServerComponentClient()).auth.getUser()).data.user
  )
    redirect(
      buildLoginHref(
        `/store/${encodeURIComponent(slug)}/products/${encodeURIComponent(productId)}?preview=1`,
      ),
    );
  const data = await readCustomProduct(
    slug,
    productId,
    preview ? "preview" : "web",
  );
  if (!data) notFound();
  return (
    <>
      {!preview && <StoreEntry slug={slug} />}
      <CustomProductView data={data} purchaseEnabled={!preview && acquisitionAvailable()} />
    </>
  );
}
