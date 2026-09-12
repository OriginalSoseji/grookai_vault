import type { MetadataRoute } from "next";
import { collectorPreview } from "@/lib/collectorPreview";
import { collectorStaging } from "@/lib/collectorStaging.mjs";

export default function robots(): MetadataRoute.Robots {
  if (collectorPreview) return { rules: [{ userAgent: "*", disallow: "/" }] };
  if (collectorStaging) return { rules: [{ userAgent: "*", disallow: "/" }] };
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/sets",
          "/sets/",
          "/card/",
          "/sitemaps/",
          "/u/",
          "/account/delete",
        ],
        disallow: [
          "/ids",
          "/ids/cards",
          "/vault",
          "/profile",
          "/account",
          "/compare",
          "/search",
          "/api/",
          "/b/",
          "/binder-invites/",
          "/binders/new",
        ],
      },
    ],
    sitemap: "https://grookaivault.com/sitemap.xml",
  };
}
