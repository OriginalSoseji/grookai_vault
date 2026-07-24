import { readFile } from "node:fs/promises";
import path from "node:path";
import { notFound } from "next/navigation";
import { getPublicProfileBySlug } from "@/lib/getPublicProfileBySlug";

export const size = {
  width: 512,
  height: 512,
};

export const contentType = "image/png";

/**
 * Social crawlers need a reliable image response more than a fragile collage.
 *
 * The former ImageResponse route fetched up to four remote card images and
 * depended on the runtime font renderer. A single unreachable image (including
 * one built with the old www host) could turn the entire profile preview into a
 * 500. Serve the checked-in brand image after validating the public profile;
 * profile-specific title and description still come from page metadata.
 */
export default async function WallOpenGraphImage({ params }: { params: { slug: string } }) {
  const profile = await getPublicProfileBySlug(params.slug);
  if (!profile || !profile.vault_sharing_enabled) {
    notFound();
  }

  const image = await readFile(path.join(process.cwd(), "public", "grookai-logo-512.png"));

  return new Response(new Uint8Array(image), {
    headers: {
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
      "Content-Type": contentType,
    },
  });
}
