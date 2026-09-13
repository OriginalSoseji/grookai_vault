import { notFound } from "next/navigation";
import PublicSetTile from "@/components/sets/PublicSetTile";
import { collectorStaging } from "@/lib/collectorStaging.mjs";
import { getCatalogSetPresentation } from "@/lib/catalogPresentation";
import manifest from "@/lib/catalogPresentation.generated.json";
import type { PublicSetSummary } from "@/lib/publicSets.shared";

// Local/staging inspection only. Never available in a production release.
export default function CatalogReview() {
  if (!collectorStaging) notFound();
  const codes = ["jpn-product-4b7ef0a0f96e6ef5", "jpn-product-009933fefda0f9f0", "jpn-product-94e8f8d9e03d3cad", "jpn-product-93e429bd4ffd351d", "jpn-product-48f4cc1504b3dc44", "jpn-product-3090050c1bdfc5ce"] as const;
  return <main className="gv-page-shell"><div className="gv-page-container py-8">
    <h1 className="mb-6 text-2xl font-semibold">Japanese Sets</h1>
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {codes.map((code, index) => {
        const e = manifest.entries[code];
        const p = getCatalogSetPresentation({ id: e.set_id, code, game: e.game, name: e.name_en ?? e.name_ja ?? code });
        const setInfo: PublicSetSummary = { code, game_code: "pokemon", name: p.name, name_ja: p.name_ja,
          display_code: p.display_code, card_count: 1, normalized_code: code, normalized_name: p.name, normalized_tokens: [],
          hero_image_url: p.package_cover_url, release_year: 2026 };
        return <PublicSetTile key={code} setInfo={setInfo} compareCards={[]} priority={index < 3} />;
      })}
    </div>
  </div></main>;
}
