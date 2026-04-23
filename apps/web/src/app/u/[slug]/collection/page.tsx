import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getPublicProfileBySlug } from "@/lib/getPublicProfileBySlug";
import { getSiteOrigin } from "@/lib/getSiteOrigin";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const profile = await getPublicProfileBySlug(params.slug);
  if (!profile) {
    return {
      title: "Profile not found | Grookai Vault",
    };
  }

  const siteOrigin = getSiteOrigin();
  const title = `${profile.display_name} Wall | Grookai Vault`;
  const description = `${profile.display_name}'s Wall on Grookai.`;

  return {
    title,
    description,
    alternates: siteOrigin
      ? {
          canonical: `${siteOrigin}/u/${profile.slug}`,
        }
      : undefined,
  };
}

export default async function PublicCollectionCompatibilityPage({ params }: { params: { slug: string } }) {
  const profile = await getPublicProfileBySlug(params.slug);

  if (!profile) {
    notFound();
  }

  redirect(`/u/${profile.slug}`);
}
