import manifest from "./catalogPresentation.generated.json" with { type: "json" };
import { formatCollectorCardReference } from "./catalogDisplayReference.ts";

type PresentationEvidence = {
  set_id: string;
  game: string;
  name_en?: string | null;
  name_ja?: string | null;
  printed_code?: string | null;
  cover_card_gv_id?: string;
  cover_role?: string;
  package_cover_url?: string;
};
const entries: Readonly<Record<string, PresentationEvidence>> = manifest.entries;
const opaqueCode = /(?:jpn-)?product-[0-9a-f]{16}|(?:artofpkm|tcgcollector):/i;

// ME05 was temporarily pointed at a warehouse object carrying the Black Bolt
// image even though the card identity is Pitch Black 094. Keep the public
// presentation on the verified TCGdex asset until the canonical warehouse
// pointer is repaired; never show the mismatched image as set artwork.
const verifiedRepresentativeCoverUrls: Readonly<Record<string, string>> = {
  me05: "https://assets.tcgdex.net/en/me/me05/094/high.webp",
};

export function getCatalogSetPresentation(input: {
  id?: string | null;
  code: string;
  game?: string | null;
  name: string;
  printedCode?: string | null;
}) {
  const code = input.code.trim().toLowerCase();
  const candidate = entries[code];
  const evidence = candidate && candidate.game === (input.game ?? "pokemon") &&
    (!input.id || candidate.set_id === input.id) ? candidate : undefined;
  const englishName = evidence?.name_en?.trim() || input.name;
  const japaneseName = evidence?.name_ja?.trim() || undefined;
  const rawCode = evidence?.printed_code || input.printedCode || input.code;
  const displayCode = opaqueCode.test(rawCode)
    ? (code.startsWith("jpn-") ? "Japanese release" : "Catalog release")
    : rawCode.toUpperCase();
  return {
    name: englishName,
    name_ja: japaneseName !== englishName ? japaneseName : undefined,
    display_code: displayCode,
    package_cover_url: input.id ? evidence?.package_cover_url : undefined,
    // Authorization remains in the existing canonical image endpoint. The
    // snapshot cannot grant access or replace live identity/image pointers.
    representative_cover_url: input.id && evidence?.cover_card_gv_id
      ? verifiedRepresentativeCoverUrls[code] ?? `/api/canon/cards/${encodeURIComponent(evidence.cover_card_gv_id)}/image` : undefined,
  };
}

export function getCollectorCardReference(input: {
  gvId: string;
  setCode?: string;
  number?: string;
  game?: string;
}) {
  if (!input.setCode?.toLowerCase().startsWith("jpn-") || !opaqueCode.test(input.gvId)) return input.gvId;
  const set = getCatalogSetPresentation({ code: input.setCode, game: input.game, name: "Japanese release" });
  return formatCollectorCardReference({ ...input, setName: set.name, displayCode: set.display_code });
}
