import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { VaultCollectionView, type RecentCardData } from "@/components/vault/VaultCollectionView";
import type { VaultCardData } from "@/components/vault/VaultCardTile";
import { isLocalVisualParityFixtureMode } from "@/lib/visualParity/fixtureMode";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Local Vault collection fixture",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

const CARD_NAMES = [
  "Pikachu ex",
  "Charizard ex",
  "Umbreon VMAX",
  "Gardevoir ex",
  "Dragonite V",
  "Mewtwo GX",
  "Blastoise",
  "Eevee",
] as const;

const SETS = [
  { code: "MEW", name: "151" },
  { code: "EVO", name: "Evolutions" },
  { code: "CEL", name: "Celebrations" },
  { code: "SIT", name: "Silver Tempest" },
] as const;

function buildCardArtwork(name: string, index: number) {
  const hue = 205 + (index % 5) * 14;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="700" viewBox="0 0 500 700"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="hsl(${hue} 72% 58%)"/><stop offset="1" stop-color="hsl(${hue + 55} 58% 24%)"/></linearGradient></defs><rect width="500" height="700" rx="34" fill="#e8d49a"/><rect x="22" y="22" width="456" height="656" rx="24" fill="url(#g)"/><circle cx="250" cy="270" r="122" fill="rgba(255,255,255,.18)"/><path d="M155 270h190M250 175v190" stroke="rgba(255,255,255,.34)" stroke-width="14"/><text x="42" y="74" fill="white" font-family="Arial" font-size="28" font-weight="700">${name}</text><text x="42" y="632" fill="white" font-family="Arial" font-size="20">Grookai visual fixture</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function makeVaultItem(index: number): VaultCardData {
  const name = CARD_NAMES[index % CARD_NAMES.length];
  const set = SETS[index % SETS.length];
  const ownedCount = index % 7 === 0 ? 3 : index % 4 === 0 ? 2 : 1;
  const intent = index % 6 === 0 ? "sell" : index % 9 === 0 ? "trade" : "hold";
  const createdAt = new Date(Date.UTC(2026, 9, 13 - (index % 12))).toISOString();
  const cardId = `fixture-card-${index + 1}`;
  const instanceId = `fixture-instance-${index + 1}`;

  return {
    id: `fixture-row-${index + 1}`,
    vault_item_id: `fixture-vault-item-${index + 1}`,
    gv_vi_id: `GVVI-FIXTURE-${String(index + 1).padStart(6, "0")}`,
    card_id: cardId,
    gv_id: `GV-PK-${set.code}-${String(index + 1).padStart(3, "0")}-HOLO`,
    name,
    set_code: set.code,
    set_name: set.name,
    number: String(index + 1).padStart(3, "0"),
    condition_label: "NM",
    intent,
    primary_intent: intent,
    hold_count: intent === "hold" ? ownedCount : 0,
    trade_count: intent === "trade" ? ownedCount : 0,
    sell_count: intent === "sell" ? ownedCount : 0,
    showcase_count: 0,
    in_play_count: intent === "hold" ? 0 : ownedCount,
    owned_count: ownedCount,
    raw_count: ownedCount,
    slab_count: 0,
    removable_raw_instance_id: instanceId,
    slab_items: [],
    copy_items: [
      {
        instance_id: instanceId,
        gv_vi_id: `GVVI-FIXTURE-${String(index + 1).padStart(6, "0")}`,
        card_printing_id: cardId,
        finish_label: "Holo",
        intent,
        condition_label: "NM",
        is_graded: false,
        grader: null,
        grade: null,
        cert_number: null,
        notes: null,
        created_at: createdAt,
        market_price: 4.25 + index * 1.17,
        pricing_observed_at: createdAt,
        pricing_published_at: createdAt,
      },
    ],
    effective_price: (4.25 + index * 1.17) * ownedCount,
    pricing_updated_at: createdAt,
    priced_raw_copy_count: ownedCount,
    unpriced_raw_copy_count: 0,
    image_url: buildCardArtwork(name, index),
    created_at: createdAt,
    is_slab: false,
    grader: null,
    grade: null,
    cert_number: null,
    is_shared: intent !== "hold",
    active_message_count: index % 13 === 0 ? 1 : 0,
    unread_message_count: index % 13 === 0 ? 1 : 0,
    messages_href: index % 13 === 0 ? "/network/inbox" : null,
  };
}

export default function VaultCollectionFixturePage() {
  if (!isLocalVisualParityFixtureMode()) {
    notFound();
  }

  const items = Array.from({ length: 56 }, (_, index) => makeVaultItem(index));
  const recent: RecentCardData[] = items.slice(0, 10).map((item) => ({
    id: item.id,
    gv_id: item.gv_id,
    name: item.name,
    display_name: item.name,
    set_code: item.set_code,
    set_name: item.set_name,
    number: item.number,
    created_at: item.created_at,
    image_url: item.image_url,
  }));

  return (
    <VaultCollectionView
      bindersEnabled
      initialItems={items}
      recent={recent}
      valueSummary={{
        totalEstimatedValue: 4286.44,
        pricedGroupedCount: items.length,
        totalGroupedCount: items.length,
        pricedCopyCount: items.reduce((total, item) => total + item.owned_count, 0),
        totalRawCopyCount: items.reduce((total, item) => total + item.owned_count, 0),
        unpricedCopyCount: 0,
        latestPricingUpdateAt: "2026-10-13T16:30:00.000Z",
      }}
      publicProfileHref="/u/fixture-collector"
    />
  );
}
