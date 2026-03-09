import type { MetadataRoute } from "next";
import { getStaticCardParams } from "@/lib/getPublicCardByGvId";
import { getSiteOrigin } from "@/lib/getSiteOrigin";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteOrigin = getSiteOrigin();
  if (!siteOrigin) {
    return [];
  }

  const cardParams = await getStaticCardParams(100);

  return [
    {
      url: `${siteOrigin}/`,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${siteOrigin}/explore`,
      changeFrequency: "daily",
      priority: 0.9,
    },
    ...cardParams.map(({ gv_id }) => ({
      url: `${siteOrigin}/card/${gv_id}`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
