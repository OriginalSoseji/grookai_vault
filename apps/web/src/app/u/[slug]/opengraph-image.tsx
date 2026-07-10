import { ImageResponse } from "next/og";
import { notFound } from "next/navigation";
import { getPublicProfileBySlug } from "@/lib/getPublicProfileBySlug";
import { getSiteOrigin } from "@/lib/getSiteOrigin";
import type { PublicWallCard } from "@/lib/sharedCards/publicWall.shared";
import { normalizePublicCardImageSrc } from "@/lib/publicCardImage";
import { getPublicCollectorWallViewBySlug } from "@/lib/wallSections/getPublicCollectorWallViewBySlug";
import { PUBLIC_WALL_SECTION_ID } from "@/lib/wallSections/wallSectionTypes";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

function dedupePublicWallCards(cards: PublicWallCard[]) {
  const cardByKey = new Map<string, PublicWallCard>();

  for (const card of cards) {
    const key = card.gv_vi_id ?? card.vault_item_id ?? card.card_print_id ?? card.gv_id;
    if (!cardByKey.has(key)) {
      cardByKey.set(key, card);
    }
  }

  return [...cardByKey.values()];
}

function initialsForName(value: string) {
  const parts = value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  const initials = parts.map((part) => part[0]?.toUpperCase()).join("");
  return initials || "GV";
}

function absoluteImageUrl(value: string | null | undefined, origin?: string | null) {
  const rawValue = value?.trim();
  if (!rawValue) {
    return null;
  }

  if (origin && rawValue.startsWith("/")) {
    return `${origin}${rawValue}`;
  }

  const normalized = normalizePublicCardImageSrc(rawValue);
  if (!normalized) {
    return null;
  }

  try {
    return new URL(normalized).toString();
  } catch {
    if (origin && normalized.startsWith("/")) {
      return `${origin}${normalized}`;
    }
  }

  return null;
}

export default async function WallOpenGraphImage({ params }: { params: { slug: string } }) {
  const profile = await getPublicProfileBySlug(params.slug);
  if (!profile || !profile.vault_sharing_enabled) {
    notFound();
  }

  const siteOrigin = getSiteOrigin();
  const sectionViews = await getPublicCollectorWallViewBySlug(profile.slug);
  const wallCards = dedupePublicWallCards(
    sectionViews.find((section) => section.id === PUBLIC_WALL_SECTION_ID)?.cards ?? [],
  ).slice(0, 4);
  const cardImages = wallCards
    .map((card) => absoluteImageUrl(card.display_image_url ?? card.image_url ?? card.representative_image_url, siteOrigin))
    .filter((url): url is string => Boolean(url))
    .slice(0, 4);
  const avatarUrl = absoluteImageUrl(profile.avatar_url, siteOrigin);
  const displayName = profile.display_name.trim();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#090b10",
          color: "#f8fafc",
          padding: "64px",
          position: "relative",
          overflow: "hidden",
          fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: "0",
            background:
              "radial-gradient(circle at 18% 8%, rgba(130,180,238,0.26), transparent 34%), radial-gradient(circle at 92% 14%, rgba(143,203,160,0.18), transparent 28%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: "32px",
            border: "1px solid rgba(255,255,255,0.10)",
            borderRadius: "42px",
          }}
        />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "470px",
            zIndex: 1,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
            <div
              style={{
                width: "88px",
                height: "88px",
                borderRadius: "28px",
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.14)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                color: "#82B4EE",
                fontSize: "30px",
                fontWeight: 800,
              }}
            >
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                initialsForName(displayName)
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
              <div
                style={{
                  fontSize: "19px",
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: "rgba(248,250,252,0.58)",
                  fontWeight: 700,
                }}
              >
                Grookai Wall
              </div>
              <div style={{ fontSize: "30px", color: "rgba(248,250,252,0.82)", fontWeight: 700 }}>
                @{profile.slug}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            <div style={{ fontSize: "62px", lineHeight: 1.02, fontWeight: 800, letterSpacing: "-0.03em" }}>
              {displayName}
            </div>
            <div style={{ fontSize: "28px", lineHeight: 1.25, color: "rgba(248,250,252,0.70)" }}>
              Public collector Wall on Grookai Vault
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              color: "rgba(248,250,252,0.58)",
              fontSize: "22px",
              fontWeight: 650,
            }}
          >
            <span>{wallCards.length} public {wallCards.length === 1 ? "card" : "cards"}</span>
            <span style={{ color: "rgba(248,250,252,0.28)" }}>·</span>
            <span>grookaivault.com</span>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "22px",
            flex: 1,
            zIndex: 1,
            paddingLeft: "42px",
          }}
        >
          {cardImages.length > 0 ? (
            cardImages.map((url, index) => (
              <div
                key={`${url}-${index}`}
                style={{
                  width: "172px",
                  height: "240px",
                  borderRadius: "22px",
                  padding: "8px",
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.16)",
                  boxShadow: "0 26px 80px rgba(0,0,0,0.44)",
                  transform: `translateY(${index % 2 === 0 ? "-18px" : "22px"}) rotate(${index % 2 === 0 ? "-2deg" : "2deg"})`,
                  overflow: "hidden",
                  display: "flex",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt=""
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    borderRadius: "16px",
                    background: "#111827",
                  }}
                />
              </div>
            ))
          ) : (
            <div
              style={{
                width: "460px",
                height: "270px",
                borderRadius: "28px",
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.06)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "rgba(248,250,252,0.58)",
                fontSize: "28px",
                fontWeight: 700,
              }}
            >
              Public Wall
            </div>
          )}
        </div>
      </div>
    ),
    size,
  );
}
