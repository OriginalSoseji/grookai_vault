import type { MetadataRoute } from "next";
import { getSiteOrigin } from "@/lib/getSiteOrigin";
import { createServerAdminClient } from "@/lib/supabase/admin";
import { getPublicSets } from "@/lib/publicSets";

const BASE_URL = "https://grookaivault.com";
const CARD_LIMIT = 5000;
const SET_LIMIT = 500;
const USER_LIMIT = 1000;

type CardSitemapRow = {
  gv_id: string | null;
  updated_at: string | null;
};

type SetTimestampRow = {
  code: string | null;
  updated_at: string | null;
};

type PublicProfileSitemapRow = {
  slug: string | null;
  updated_at: string | null;
};

function getSitemapOrigin() {
  return getSiteOrigin() ?? BASE_URL;
}

function fallbackTimestamp(value?: string | null) {
  return value ?? new Date().toISOString();
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteOrigin = getSitemapOrigin();
  const admin = createServerAdminClient();

  const [{ data: cards, error: cardsError }, publicSets, { data: profiles, error: profilesError }] = await Promise.all([
    admin
      .from("card_prints")
      .select("gv_id,updated_at")
      .not("gv_id", "is", null)
      .order("updated_at", { ascending: false })
      .limit(CARD_LIMIT),
    getPublicSets(),
    admin
      .from("public_profiles")
      .select("slug,updated_at")
      .eq("public_profile_enabled", true)
      .not("slug", "is", null)
      .order("updated_at", { ascending: false })
      .limit(USER_LIMIT),
  ]);

  if (cardsError) {
    throw new Error(cardsError.message);
  }

  if (profilesError) {
    throw new Error(profilesError.message);
  }

  const selectedSets = publicSets.slice(0, SET_LIMIT);
  const selectedSetCodes = selectedSets.map((setInfo) => setInfo.code);
  const setTimestampsByCode = new Map<string, string | null>();

  if (selectedSetCodes.length > 0) {
    const { data: setRows, error: setsError } = await admin
      .from("sets")
      .select("code,updated_at")
      .in("code", selectedSetCodes);

    if (setsError) {
      throw new Error(setsError.message);
    }

    for (const row of (setRows ?? []) as SetTimestampRow[]) {
      if (row.code) {
        setTimestampsByCode.set(row.code, row.updated_at ?? null);
      }
    }
  }

  const staticUrls: MetadataRoute.Sitemap = [
    {
      url: `${siteOrigin}/`,
      lastModified: new Date().toISOString(),
    },
    {
      url: `${siteOrigin}/sets`,
      lastModified: new Date().toISOString(),
    },
    {
      url: `${siteOrigin}/explore`,
      lastModified: new Date().toISOString(),
    },
  ];

  const setUrls: MetadataRoute.Sitemap = selectedSets.map((setInfo) => ({
    url: `${siteOrigin}/sets/${setInfo.code}`,
    lastModified: fallbackTimestamp(setTimestampsByCode.get(setInfo.code)),
  }));

  const cardUrls: MetadataRoute.Sitemap = ((cards ?? []) as CardSitemapRow[])
    .filter((card): card is CardSitemapRow & { gv_id: string } => Boolean(card.gv_id))
    .map((card) => ({
      url: `${siteOrigin}/card/${card.gv_id}`,
      lastModified: fallbackTimestamp(card.updated_at),
    }));

  const userUrls: MetadataRoute.Sitemap = ((profiles ?? []) as PublicProfileSitemapRow[])
    .filter((profile): profile is PublicProfileSitemapRow & { slug: string } => Boolean(profile.slug))
    .map((profile) => ({
      url: `${siteOrigin}/u/${profile.slug}`,
      lastModified: fallbackTimestamp(profile.updated_at),
    }));

  return [...staticUrls, ...setUrls, ...cardUrls, ...userUrls];
}
