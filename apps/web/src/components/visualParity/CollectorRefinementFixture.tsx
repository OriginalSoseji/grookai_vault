"use client";
import Link from "next/link";
import { BrandText } from "@/components/brand/BrandText";
import { useState } from "react";
import BinderPageArrangement from "@/components/binders/BinderPageArrangement";
import { CustomBinderSlotEditor } from "@/components/binders/CustomBinderSlotEditor";
import BinderCoverPicker from "@/components/binders/BinderCoverPicker";
import type { BinderChecklistSlot } from "@/lib/binders/types";
import CollectorWorkspace from "@/components/vault/CollectorWorkspace";
import CardPageMarketVaultPanels from "@/components/cards/CardPageMarketVaultPanels";
import PublicCardImage from "@/components/PublicCardImage";
import CardMarketplaceLinks, {
  MarketplaceConditionChooser,
  type MarketplaceLink,
} from "@/components/pricing/CardMarketplaceLinks";
import type { AddToVaultCardServerAction } from "@/components/vault/AddToVaultCardAction";
import type { AddSlabActionResult } from "@/components/slabs/AddSlabCardAction";
import type { CardPricingUiRecord } from "@/lib/pricing/getCardPricingUiByCardPrintId";
import type { VaultCardData } from "@/components/vault/VaultCardTile";

const eeveeImage = "/visual-fixtures/collector/eevee-173.webp";
const pikachuImage = "/visual-fixtures/collector/pikachu-58.webp";
const cardId = "a36f8d8a-353f-4cca-ba89-912eb7f10c3a";
const printingId = "2395183d-ab12-4f9d-9014-9abda113e7d6";
// Exact product/finish mapping recorded by the read-only resolver audit. Ownership and prices are samples.
const sampleLink: MarketplaceLink = {
  card_print_id: cardId,
  card_printing_id: printingId,
  finish: "Holofoil",
  language: "English",
  conditions: [
    ["NM", "Near Mint"],
    ["LP", "Lightly Played"],
    ["MP", "Moderately Played"],
    ["HP", "Heavily Played"],
    ["DMG", "Damaged"],
  ].map(([code, label]) => ({
    code,
    label,
    url: `https://www.tcgplayer.com/product/610758?${new URLSearchParams({
      Condition: label,
      Printing: "Holofoil",
      Language: "English",
    })}`,
  })),
};
const samplePricing: CardPricingUiRecord = {
  pricing_scope: "card_printing",
  card_print_id: cardId,
  card_printing_id: printingId,
  finish_key: "holo",
  status: "available",
  currency: "USD",
  market_close: 8.37,
  source_name: "tcgplayer",
  source_label: "Sample market price",
  observed_at: "2026-10-25T12:00:00Z",
  published_at: "2026-10-25T12:00:00Z",
  freshness: "fresh",
  is_from_price: false,
  eligible_printing_count: 1,
  primary_price: 8.37,
  primary_source: "tcgplayer_market",
  display_label: "Sample market price",
  pricing_basis: "tcgplayer_market_exact",
};
export const refinementFixtureItems: VaultCardData[] = [0, 1, 2].map(
  (index) => ({
    id: `row-${index}`,
    vault_item_id: `bucket-${index}`,
    gv_vi_id: `GVVI-FIXTURE-00000${index + 1}`,
    card_id: index === 1 ? "8e2d1c3e-f7e4-4d35-a842-569d6ac68a27" : cardId,
    gv_id: index === 1 ? "GV-PK-BS-58" : "GV-PK-PR-SV-173",
    name: index === 1 ? "Pikachu" : "Eevee",
    set_code: index === 1 ? "base1" : "svp",
    set_name: index === 1 ? "Base Set" : "Scarlet & Violet Promos",
    number: index === 1 ? "58" : "173",
    image_url: index === 1 ? pikachuImage : eeveeImage,
    condition_label: index === 2 ? "NM" : "LP",
    intent: "hold",
    primary_intent: "hold",
    hold_count: 1,
    trade_count: 0,
    sell_count: 0,
    showcase_count: 0,
    in_play_count: 0,
    owned_count: 1,
    raw_count: 1,
    slab_count: 0,
    removable_raw_instance_id: null,
    slab_items: [],
    copy_items: [{
      instance_id: `78888ab1-0011-4111-8111-00000000000${index}`,
      gv_vi_id: `GVVI-FIXTURE-00000${index + 1}`,
      card_printing_id: index === 1 ? null : printingId,
      finish_label: index === 1 ? "Normal" : "Holofoil",
      intent: "hold",
      condition_label: index === 2 ? "NM" : "LP",
      is_graded: false,
      grader: null,
      grade: null,
      cert_number: null,
      notes: null,
      created_at: null,
      market_price: index === 2 ? null : 8.37 + index,
    }],
    effective_price: index === 2 ? null : 8.37 + index,
    priced_raw_copy_count: index === 2 ? 0 : 1,
    unpriced_raw_copy_count: index === 2 ? 1 : 0,
    created_at: null,
    is_slab: false,
    grader: null,
    grade: null,
    cert_number: null,
    is_shared: false,
    active_message_count: 0,
    unread_message_count: 0,
    messages_href: null,
  }),
);
export default function CollectorRefinementFixture({
  view,
  origin,
  addAction,
  slabAction,
}: {
  view: string;
  origin: string;
  addAction: AddToVaultCardServerAction;
  slabAction: (
    previous: AddSlabActionResult | null,
    form: FormData,
  ) => Promise<AddSlabActionResult>;
}) {
  const image = `${origin}${eeveeImage}`;
  const fixtureItems = refinementFixtureItems.map((item) => ({
    ...item,
    image_url: `${origin}${item.image_url}`,
  }));
  const [slots, setSlots] = useState(() =>
    Array.from({ length: 12 }, (_, index) => ({
      localKey: `slot-${index}`,
      title: index % 3 === 1 ? "Pikachu" : "Eevee",
      subtitle: index % 3 === 1 ? "Base Set · 58" : "SV Promos · 173",
      imageUrl: `${origin}${index % 3 === 1 ? pikachuImage : eeveeImage}`,
    }))
  );
  const [cover,setCover]=useState('');
  const editorSlots:BinderChecklistSlot[]=slots.map((slot,index)=>({slotPublicId:slot.localKey,cardPrintId:index===1?'8e2d1c3e-f7e4-4d35-a842-569d6ac68a27':cardId,cardPrintingId:printingId,title:slot.title,subtitle:slot.subtitle,finishLabel:'Holofoil',imageUrl:slot.imageUrl,hostedImage:true,status:'missing',inYourVault:false,contributedByYou:false,needsFinishReview:false,satisfiedQuantity:0,requiredQuantity:1,contributors:[],contributions:[],publicContributionActions:[],publicContributionActionsHasMore:false,contributionPublicId:null,contributionState:'none'}));
  const chooser = (condition?: string) => (
    <MarketplaceConditionChooser
      link={sampleLink}
      identity="Eevee"
      context="Scarlet & Violet Promos · 173"
      imageUrl={image}
      condition={condition}
    />
  );
  return (
    <main className="gv-refinement-preview">
      <div className="gv-preview-top">
        <Link
          href="/visual-fixtures/collector-refinement"
          aria-label="Card preview"
        >
          ←
        </Link>
        <BrandText includeVault />
        <span className="text-xs font-normal opacity-50">Local preview</span>
      </div>
      <nav className="gv-preview-tabs" aria-label="Preview screens">
        {[["card", "Card"], ["add", "Add copy"], [
          "workspace",
          "Select & trade",
        ], ["binder", "Binder"]].map(([key, label]) => (
          <Link
            key={key}
            href={`?view=${key}`}
            aria-current={view === key ? "page" : undefined}
          >
            {label}
          </Link>
        ))}
      </nav>
      {view === 'editor' ? <form onSubmit={e=>e.preventDefault()}><CustomBinderSlotEditor unoptimizedImages inputName="slotsJson" mode="revision" initialSlots={editorSlots}/></form> : view==='cover' ? <BinderCoverPicker unoptimizedImages options={slots.slice(0,2).map((slot,index)=>({cardPrintId:index===1?'pikachu':cardId,label:slot.title,imageUrl:slot.imageUrl,subtitle:slot.subtitle}))} value={cover} onChange={setCover} allowCurrent={false}/> : view === "workspace"
        ? (
          <CollectorWorkspace
            items={fixtureItems}
            ownerId="local-fixture-owner"
          />
        )
        : view === "binder"
        ? (
          <>
            <h1 className="mb-1 text-2xl font-bold">The collection</h1>
            <p className="mb-5 text-sm text-[var(--gv-text-secondary)]">
              12 cards · Arrange your pages
            </p>
            <BinderPageArrangement
              unoptimizedImages
              slots={slots}
              onMove={(from, to) =>
                setSlots((current) => {
                  const next = [...current];
                  const [slot] = next.splice(from, 1);
                  next.splice(to, 0, slot);
                  return next;
                })}
            />
          </>
        )
        : (
          <>
            <div className="gv-preview-card-layout">
              <div className="gv-preview-art">
                <PublicCardImage
                  src={image}
                  alt="Eevee 173, Scarlet & Violet Promos"
                  imageClassName="w-full rounded-[10px] object-contain"
                  fallbackClassName="aspect-[5/7]"
                  priority
                  unoptimized
                />
              </div>
              <div className="gv-preview-card-content">
                <div className="mb-5">
                  <div className="flex items-baseline gap-3">
                    <h1 className="text-[28px] font-bold leading-tight">
                      Eevee
                    </h1>
                    <span className="text-lg text-[var(--gv-text-secondary)]">
                      173
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-[var(--gv-text-secondary)]">
                    Scarlet & Violet Promos
                  </p>
                  <p className="mt-1 text-xs text-[var(--gv-text-secondary)]">
                    Holofoil · English
                  </p>
                </div>
                {view === "resolver"
                  ? (
                    <CardMarketplaceLinks
                      cardPrintId={cardId}
                      cardPrintingId={printingId}
                      identity="Eevee"
                      context="Scarlet & Violet Promos · 173"
                      imageUrl={image}
                      condition="LP"
                    />
                  )
                  : view === "marketplace"
                  ? chooser("LP")
                  : (
                    <CardPageMarketVaultPanels
                      initialAddOpen={view === "add"}
                      addToVaultAction={addAction}
                      createSlabAction={slabAction}
                      isAuthenticated
                      loginHref="/login"
                      currentPath="/visual-fixtures/collector-refinement?view=add"
                      gvId="GV-PK-PR-SV-173"
                      cardPrintId={null}
                      cardName="Eevee"
                      imageUrl={image}
                      setName="Scarlet & Violet Promos"
                      collectorNumber="173"
                      printings={[{
                        id: printingId,
                        finish_key: "holo",
                        finish_name: "Holofoil",
                      }]}
                      pricing={samplePricing}
                      pricingRecords={[samplePricing]}
                      ownershipLabel="1 copy in your vault"
                      rawCount={1}
                      slabCount={0}
                      marketplaceAction={chooser()}
                    />
                  )}
                <div className="gv-preview-owned">
                  <PublicCardImage
                    src={image}
                    alt=""
                    imageClassName="w-10 rounded-[6px]"
                    fallbackClassName="w-10"
                    unoptimized
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Lightly Played</p>
                    <p className="mt-1 text-xs text-[var(--gv-text-secondary)]">
                      1 copy · Holofoil
                    </p>
                  </div>
                  <a
                    className="gv-secondary-button"
                    target="_blank"
                    rel="noopener noreferrer"
                    href={sampleLink.conditions[1].url}
                  >
                    LP ↗
                  </a>
                </div>
              </div>
            </div>
          </>
        )}
      <p className="gv-preview-notice">
        Sample collection · Adds are simulated. Trade drafts save on this
        device.
      </p>
    </main>
  );
}
