import { notFound, redirect } from "next/navigation";
import { createServerComponentClient } from "@/lib/supabase/server";
import { buildLoginHref } from "@/lib/auth/routeAccess";
import { readCustomProduct } from "@/lib/stores/customProductServer";
import { CustomProductView } from "@/components/stores/CustomProductView";
import { StoreEntry } from "@/components/stores/StoreEntry";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = {
  title: "Collectible | Grookai Vault",
  robots: { index: false, follow: false },
};
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
      <CustomProductView data={data} />
    </>
  );
}
