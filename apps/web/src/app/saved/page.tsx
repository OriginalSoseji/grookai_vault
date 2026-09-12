import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import PokemonCardGridTile from "@/components/cards/PokemonCardGridTile";
import SaveCardButton from "@/components/cards/SaveCardButton";
import ProductState from "@/components/layout/ProductState";
import { requireServerUser } from "@/lib/auth/requireServerUser";
import { resolveCardImageFieldsV1, type CardImageLike } from "@/lib/canon/resolveCardImageFieldsV1";
import { resolveDisplayIdentity } from "@/lib/cards/resolveDisplayIdentity";

export const dynamic = "force-dynamic";
export const revalidate = 0;
const PAGE_SIZE = 24;

type SavedCard = CardImageLike & {
  id: string; gv_id: string | null; name: string | null; number: string | null;
  variant_key: string | null; printed_identity_modifier: string | null;
  sets: { name: string | null; identity_model: string | null } | null;
};

export default async function SavedPage({ searchParams }: {
  searchParams: Promise<{ page?: string }>;
}) {
  const requested = (await searchParams).page;
  const page = typeof requested === "string" && /^[1-9]\d{0,3}$/.test(requested) ? Number(requested) : 1;
  const { supabase, user } = await requireServerUser(`/saved?page=${page}`);
  const { data, error } = await supabase.from("wishlist_items")
    .select("id,card_id,created_at,card_prints(id,gv_id,name,number,set_code,variant_key,printed_identity_modifier,image_url,image_alt_url,image_source,image_path,representative_image_url,image_status,image_note,sets(name,identity_model))")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false }).order("id", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const rows = (data ?? []) as unknown as Array<{ id: string; card_id: string; card_prints: SavedCard | null }>;
  const visible = await Promise.all(rows.slice(0, PAGE_SIZE).map(async row => ({
    ...row,
    image: row.card_prints ? await resolveCardImageFieldsV1(row.card_prints) : null,
  })));
  return <div className="space-y-8 py-8">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <h1 className="gv-display-title">Saved cards</h1>
      <Link href="/vault" className="gv-secondary-button">Your Vault</Link>
    </header>
    {error ? <ProductState compact tone="error" title="Saved cards could not load" description="Your saved cards have not been changed."
      action={<Link href={`/saved?page=${page}`} className="gv-primary-button">Try again</Link>} />
      : visible.length === 0 ? <ProductState compact title={page === 1 ? "No saved cards yet" : "No more saved cards"}
        description={page === 1 ? "Cards you save will appear here." : "You've reached the end of this list."}
        action={<Link href={page === 1 ? "/explore" : "/saved"} className="gv-primary-button">{page === 1 ? "Search cards" : "Back to saved cards"}</Link>} />
      : <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {visible.map(row => {
          const card = row.card_prints;
          const identity = card ? resolveDisplayIdentity({ name: card.name ?? "Unknown card",
            variant_key: card.variant_key ?? undefined, printed_identity_modifier: card.printed_identity_modifier ?? undefined,
            set_identity_model: card.sets?.identity_model ?? undefined, set_code: card.set_code ?? undefined,
            number: card.number ?? undefined }) : null;
          const href = card?.gv_id ? `/card/${encodeURIComponent(card.gv_id)}` : undefined;
          return <PokemonCardGridTile key={row.id} imageSrc={row.image?.display_image_url ?? undefined}
            imageAlt={identity?.display_name ?? "Card unavailable"} imageHref={href}
            title={href ? <Link href={href}>{identity?.display_name}</Link> : "Card unavailable"}
            subtitle={card ? [card.sets?.name ?? card.set_code, card.number].filter(Boolean).join(" / ") : undefined}
            actions={<SaveCardButton cardPrintId={row.card_id} loginHref="/login?next=/saved" isAuthenticated initialSaved refreshOnChange />} />;
        })}
      </div>}
    {!error && (page > 1 || rows.length > PAGE_SIZE) ? <nav aria-label="Saved cards pages" className="flex items-center justify-center gap-5">
      {page > 1 ? <Link href={`/saved?page=${page - 1}`} className="gv-secondary-button" aria-label="Previous page"><ChevronLeft size={18} /></Link> : null}
      <span className="text-sm">Page {page}</span>
      {rows.length > PAGE_SIZE ? <Link href={`/saved?page=${page + 1}`} className="gv-secondary-button" aria-label="Next page"><ChevronRight size={18} /></Link> : null}
    </nav> : null}
  </div>;
}
