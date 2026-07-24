import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
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
