"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, ChevronDown, SlidersHorizontal } from "lucide-react";
import PublicSearchForm from "@/components/PublicSearchForm";
import PublicCardImage from "@/components/PublicCardImage";
import CardImageTruthBadge from "@/components/cards/CardImageTruthBadge";
import CompareCardButton from "@/components/compare/CompareCardButton";
import CompareTray from "@/components/compare/CompareTray";
import VisiblePrice from "@/components/pricing/VisiblePrice";
import { useClientReady } from "@/components/layout/useClientReady";
import type { ComparePublicCard } from "@/lib/cards/getPublicCardsByGvIds";
import { resolveDisplayIdentity } from "@/lib/cards/resolveDisplayIdentity";
import { getCardImageAltText, resolveCardImagePresentation } from "@/lib/cards/resolveCardImagePresentation";
import { buildPathWithCompareCards, normalizeCompareCardsParam } from "@/lib/compareCards";
import { PUBLIC_GAME_SCOPE_OPTIONS } from "@/lib/publicGameScope";

type Props = { cards: ComparePublicCard[]; canViewPricing: boolean; printedTotal?: number | null };

export default function CollectorCatalogView({ cards, canViewPricing, printedTotal }: Props) {
  const params = useSearchParams();
  const router = useRouter();
  const ready = useClientReady();
  const compareCards = normalizeCompareCardsParam(params.get("cards"));
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [rarity, setRarity] = useState("");
  const [sort, setSort] = useState("featured");
  const href = (path: string, query = "") => buildPathWithCompareCards(path, query, compareCards);
  const title = (card: ComparePublicCard) => resolveDisplayIdentity({
    name: card.name, variant_key: card.variant_key, printed_identity_modifier: card.printed_identity_modifier,
    set_identity_model: card.set_identity_model, set_code: card.set_code ?? "", number: card.number,
  }).display_name;
  const artwork = (card: ComparePublicCard, priority = false) => <PublicCardImage
    src={card.display_image_url ?? card.image_url} fallbackSrc={card.display_image_fallback_url}
    fallbackSources={[card.external_image_fallback_url]} alt={getCardImageAltText(title(card), card)}
    imageClassName="gv-approved-art" fallbackClassName="gv-approved-missing" priority={priority}
    sizes="(max-width: 760px) 42vw, (max-width: 1100px) 24vw, 18vw" />;
  const hero = ["GV-PK-MEW-198", "GV-PK-MEW-200", "GV-PK-MEW-199"].map(id => cards.find(card => card.gv_id === id));
  const hasHero = hero.every(card => card && resolveCardImagePresentation(card).displayImageKind === "exact");
  const visible = cards.filter(card => !rarity || card.rarity === rarity).toSorted((a, b) => {
    if (sort === "name") return title(a).localeCompare(title(b));
    if (sort === "low") return (a.raw_price ?? Infinity) - (b.raw_price ?? Infinity);
    if (sort === "high") return (b.raw_price ?? -Infinity) - (a.raw_price ?? -Infinity);
    return 0;
  });

  return <div className="gv-approved-catalog">
    <section className="gv-approved-heading">
      <div><p className="gv-approved-eyebrow">YOUR COLLECTOR&apos;S CORNER</p><h1>A good find starts here.</h1>
        <p className="gv-approved-description">Old favorites. New obsessions. The next piece of your collection.</p></div>
      <Link className="gv-approved-link" href={href("/vault")}>Open my Vault <ArrowRight size={18} /></Link>
    </section>
    {hasHero && <section className="gv-approved-feature" aria-label="151 collection">
      <div className="gv-approved-feature-copy"><p className="gv-approved-eyebrow">BACK TO WHERE IT BEGAN</p>
        <h2>The original 151.</h2><p>A little nostalgia. A whole new perspective.</p>
        <Link href={href(`/sets/${hero[0]!.set_code}`)}>Explore the collection <ArrowRight size={17} /></Link></div>
      <div className="gv-approved-feature-art">{hero.map((card, index) => card && <Link key={card.gv_id}
        href={href(`/card/${card.gv_id}`)} className={`gv-approved-feature-${index}`} aria-label={title(card)}>{artwork(card, true)}</Link>)}</div>
      <span className="gv-approved-feature-number" aria-hidden="true">151</span>
    </section>}
    <div className="gv-approved-browse-heading"><h2>Find your next addition</h2><Link className="gv-approved-link" href={href("/sets")}>Browse sets <ArrowRight size={15} /></Link></div>
    <nav className="gv-approved-game-tabs" aria-label="Game filter">{PUBLIC_GAME_SCOPE_OPTIONS.map((game, index) => {
      const next = new URLSearchParams(params.toString());
      if (game.value === "pokemon") next.delete("game"); else next.set("game", game.value);
      return <Link key={game.value} href={href("/explore", next.toString())} aria-current={game.value === "pokemon" ? "page" : undefined}>
        <span className={`gv-approved-game-dot gv-approved-game-${index}`} />{game.label === "Pokemon" ? "Pokémon" : game.label}</Link>;
    })}</nav>
    <div className="gv-approved-toolbar">
      <PublicSearchForm variant="collector" />
      <label className="gv-approved-select"><span className="sr-only">Product type</span><select aria-label="Product type" value="cards" disabled={!ready}
        onChange={event => { if (event.target.value === "sealed") router.push(href("/sealed/pokemon")); }}><option value="cards">Cards</option><option value="sealed">Sealed</option></select><ChevronDown size={15} /></label>
      <button className="gv-approved-filter" disabled={!ready} onClick={() => setFiltersOpen(!filtersOpen)} aria-expanded={filtersOpen} aria-controls="collector-rarity-filters"><SlidersHorizontal size={16} />Filters</button>
      <label className="gv-approved-select"><span className="sr-only">Sort featured cards</span><select aria-label="Sort featured cards" value={sort} disabled={!ready} onChange={event => setSort(event.target.value)}>
        <option value="featured">Featured</option><option value="name">Name: A to Z</option>
        {canViewPricing && <><option value="low">Price: low to high</option><option value="high">Price: high to low</option></>}</select><ChevronDown size={15} /></label>
    </div>
    {filtersOpen && <div className="gv-approved-filters" id="collector-rarity-filters"><label>Rarity<select aria-label="Rarity" value={rarity} onChange={event => setRarity(event.target.value)}>
      <option value="">All rarities</option>{[...new Set(cards.map(card => card.rarity).filter(Boolean))].map(value => <option key={value} value={value}>{value}</option>)}</select></label>
      <button className="gv-approved-link" onClick={() => { setRarity(""); setSort("featured"); }}>Reset filters</button>
      <Link className="gv-approved-link" href={href("/explore", "identity=stamped")}>Stamps and variants <ArrowRight size={15} /></Link></div>}
    <div className="gv-approved-results" role="status"><span>{visible.length} featured cards</span><span>Pokémon · {params.get("lang") === "ja" ? "Japanese" : "English"}</span></div>
    {visible.length ? <div className="gv-approved-product-grid">{visible.map(card => {
      const image = resolveCardImagePresentation(card);
      const detailHref = href(`/card/${card.gv_id}`);
      return <article className="gv-approved-product" key={card.gv_id} data-card-id={card.gv_id}>
        <Link className="gv-approved-product-image" href={detailHref}>{artwork(card)}</Link>
        {image.compactBadgeLabel && <CardImageTruthBadge label={image.compactBadgeLabel} emphasis={image.isCollisionRepresentative ? "strong" : "default"} />}
        <div className="gv-approved-product-info"><p className="gv-approved-overline">POKÉMON · {card.set_name ?? card.set_code}</p>
          <Link className="gv-approved-product-title" href={detailHref}>{title(card)}</Link>
          <p className="gv-approved-identity">{card.number}{printedTotal && card.set_code === "sv03.5" ? `/${printedTotal}` : ""}</p>
          <p className="gv-approved-rarity">{card.rarity ?? ""}</p>
          <div className="gv-approved-product-bottom"><div>{canViewPricing && typeof card.raw_price === "number" ? <VisiblePrice value={card.raw_price} size="dense"
            cardPrintId={card.id} observedAt={card.raw_price_ts} publishedAt={card.raw_price_published_at} provenanceId={card.pricing_provenance_id}
            sourceLabel={card.pricing_source_label} pricingScope={card.pricing_scope} isFromPrice={card.pricing_is_from_price} />
            : <Link className="gv-approved-price-link" href={canViewPricing ? detailHref : `/login?next=${encodeURIComponent(detailHref)}`}>{canViewPricing ? "Price unavailable" : "Sign in for pricing"}</Link>}</div>
            <div className="gv-approved-product-actions"><CompareCardButton gvId={card.gv_id} variant="floating" /><Link href={detailHref} aria-label={`View ${title(card)}`} title="View card"><ArrowRight size={17} /></Link></div></div>
        </div>
      </article>;
    })}</div> : <div className="gv-approved-empty"><h2>No matching featured cards.</h2><Link className="gv-approved-link" href={href("/sets")}>Browse the catalog <ArrowRight size={16} /></Link></div>}
    <CompareTray cards={compareCards} addHref={href("/explore", params.toString())} />
  </div>;
}
