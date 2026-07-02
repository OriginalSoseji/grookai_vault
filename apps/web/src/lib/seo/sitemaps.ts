import "server-only";

import { NextResponse } from "next/server";
import { getSiteOrigin } from "@/lib/getSiteOrigin";
import { getPublicSets } from "@/lib/publicSets";
import { createServerAdminClient } from "@/lib/supabase/admin";

const BASE_URL = "https://grookaivault.com";

export const SITEMAP_REVALIDATE_SECONDS = 300;
export const CARD_SITEMAP_PAGE_SIZE = 45_000;
const SUPABASE_SITEMAP_FETCH_CHUNK_SIZE = 1_000;

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

type SitemapEntry = {
  loc: string;
  lastmod?: string | null;
};

export function getSitemapOrigin() {
  return getSiteOrigin() ?? BASE_URL;
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function normalizeLastmod(value?: string | null) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function xmlResponse(body: string) {
  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": `public, s-maxage=${SITEMAP_REVALIDATE_SECONDS}, stale-while-revalidate=${SITEMAP_REVALIDATE_SECONDS}`,
    },
  });
}

export function sitemapIndexResponse(entries: SitemapEntry[]) {
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries
    .map((entry) => {
      const lastmod = normalizeLastmod(entry.lastmod);
      return `  <sitemap>\n    <loc>${escapeXml(entry.loc)}</loc>${
        lastmod ? `\n    <lastmod>${escapeXml(lastmod)}</lastmod>` : ""
      }\n  </sitemap>`;
    })
    .join("\n")}\n</sitemapindex>\n`;

  return xmlResponse(body);
}

export function urlSetResponse(entries: SitemapEntry[]) {
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries
    .map((entry) => {
      const lastmod = normalizeLastmod(entry.lastmod);
      return `  <url>\n    <loc>${escapeXml(entry.loc)}</loc>${
        lastmod ? `\n    <lastmod>${escapeXml(lastmod)}</lastmod>` : ""
      }\n  </url>`;
    })
    .join("\n")}\n</urlset>\n`;

  return xmlResponse(body);
}

export async function getPublicCardSitemapPageCount() {
  const admin = createServerAdminClient();
  const { count, error } = await admin
    .from("card_prints")
    .select("id", { count: "exact", head: true })
    .not("gv_id", "is", null);

  if (error) {
    throw new Error(error.message);
  }

  return Math.max(1, Math.ceil((count ?? 0) / CARD_SITEMAP_PAGE_SIZE));
}

export async function getCardSitemapEntries(pageIndex: number) {
  const safePageIndex = Number.isInteger(pageIndex) && pageIndex >= 0 ? pageIndex : 0;
  const from = safePageIndex * CARD_SITEMAP_PAGE_SIZE;
  const to = from + CARD_SITEMAP_PAGE_SIZE - 1;
  const origin = getSitemapOrigin();
  const admin = createServerAdminClient();
  const rows: CardSitemapRow[] = [];

  for (let chunkStart = from; chunkStart <= to; chunkStart += SUPABASE_SITEMAP_FETCH_CHUNK_SIZE) {
    const chunkEnd = Math.min(chunkStart + SUPABASE_SITEMAP_FETCH_CHUNK_SIZE - 1, to);
    const { data, error } = await admin
      .from("card_prints")
      .select("gv_id,updated_at")
      .not("gv_id", "is", null)
      .order("gv_id", { ascending: true })
      .range(chunkStart, chunkEnd);

    if (error) {
      throw new Error(error.message);
    }

    const chunkRows = (data ?? []) as CardSitemapRow[];
    rows.push(...chunkRows);

    if (chunkRows.length < chunkEnd - chunkStart + 1) {
      break;
    }
  }

  return rows
    .filter((card): card is CardSitemapRow & { gv_id: string } => Boolean(card.gv_id))
    .map((card) => ({
      loc: `${origin}/card/${encodeURIComponent(card.gv_id)}`,
      lastmod: card.updated_at,
    }));
}

export async function getSetSitemapEntries() {
  const origin = getSitemapOrigin();
  const admin = createServerAdminClient();
  const publicSets = await getPublicSets();
  const setTimestampsByCode = new Map<string, string | null>();
  const setCodes = publicSets.map((setInfo) => setInfo.code).filter(Boolean);

  if (setCodes.length > 0) {
    const { data, error } = await admin
      .from("sets")
      .select("code,updated_at")
      .in("code", setCodes);

    if (error) {
      throw new Error(error.message);
    }

    for (const row of (data ?? []) as SetTimestampRow[]) {
      if (row.code) {
        setTimestampsByCode.set(row.code, row.updated_at ?? null);
      }
    }
  }

  return publicSets.map((setInfo) => ({
    loc: `${origin}/sets/${encodeURIComponent(setInfo.code)}`,
    lastmod: setTimestampsByCode.get(setInfo.code),
  }));
}

export async function getPublicProfileSitemapEntries() {
  const origin = getSitemapOrigin();
  const admin = createServerAdminClient();
  const { data, error } = await admin
    .from("public_profiles")
    .select("slug,updated_at")
    .eq("public_profile_enabled", true)
    .not("slug", "is", null)
    .order("updated_at", { ascending: false })
    .limit(CARD_SITEMAP_PAGE_SIZE);

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as PublicProfileSitemapRow[])
    .filter((profile): profile is PublicProfileSitemapRow & { slug: string } => Boolean(profile.slug))
    .map((profile) => ({
      loc: `${origin}/u/${encodeURIComponent(profile.slug)}`,
      lastmod: profile.updated_at,
    }));
}

export function getStaticSitemapEntries() {
  const origin = getSitemapOrigin();
  return [
    { loc: `${origin}/` },
    { loc: `${origin}/sets` },
    { loc: `${origin}/explore` },
  ];
}
