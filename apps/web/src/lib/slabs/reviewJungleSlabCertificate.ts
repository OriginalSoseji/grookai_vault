import { parseJungleEditionResolution, type JungleEditionOption } from "@/lib/cards/jungleEditionResolution";
import { normalizePsaCertNumber, parsePsaCertificateResponse, type SlabVerificationResult } from "@/lib/slabs/psaCertificateResponse";

type CanonicalJungleCard = {
  id: string; gv_id: string; name: string; number: string; set_code: string;
  game_code: string; language: string; printed_identity_modifier: string;
};
type Review =
  | { status: "matched"; option: JungleEditionOption; certNumber: string; grade: string }
  | { status: "held"; reason: string };
const label = (v: string | null) => (v ?? "").normalize("NFKC").trim().replace(/\s+/g, " ").toUpperCase();
const held = (reason: string): Review => ({ status: "held", reason });
const number = (value: string) => {
  const match = value.trim().match(/^#?0*([1-9]|[1-5][0-9]|6[0-4])(?:\s*\/\s*64)?$/);
  return match ? Number(match[1]) : null;
};

// Evidence comparison only. The canonical row/resolution must come from the
// server, never a form. This does not create a slab, select an edition for the
// owner, mint catalog identity, or authorize changing an existing copy.
export function reviewJungleSlabCertificate(input: {
  requestedCertNumber: string; verification: SlabVerificationResult;
  resolution: unknown; canonical: CanonicalJungleCard; selectedPrintingId: string;
}): Review {
  let resolution;
  try { resolution = parseJungleEditionResolution(input.resolution); }
  catch { return held("INVALID_EDITION_RESOLUTION"); }
  if (resolution.status !== "ready") return held("EDITION_SELECTION_REQUIRED");
  const card = input.canonical;
  const option = resolution.options.find(o => o.card_print_id === card.id && o.card_printing_id === input.selectedPrintingId);
  if (!option || option.gv_id !== card.gv_id || card.game_code !== "pokemon" || card.set_code !== "base2"
    || card.language !== "en" || card.printed_identity_modifier !== `edition:${option.edition}`
    || number(card.number) !== Number(option.gv_id.split("-")[3])) return held("CANONICAL_SELECTION_MISMATCH");

  if (!input.verification.verified || input.verification.grader !== "PSA"
    || normalizePsaCertNumber(input.verification.cert_number) !== normalizePsaCertNumber(input.requestedCertNumber)) {
    return held("CERTIFICATE_UNVERIFIED");
  }
  // Re-read the bound provider response, rather than trusting convenience fields.
  const verified = parsePsaCertificateResponse(input.requestedCertNumber, input.verification.raw_payload);
  if (!verified.verified || !verified.identity || !verified.grade) return held("CERTIFICATE_UNVERIFIED");
  const cert = verified.identity;
  if (cert.isPsaDna !== false || cert.isDualCert !== false || cert.itemStatus !== null) return held("CERTIFICATE_REVIEW_REQUIRED");
  if (cert.year !== "1999" || !["POKEMON JUNGLE", "POKÉMON JUNGLE"].includes(label(cert.brand))
    || label(cert.category) !== "TCG CARDS" || number(cert.cardNumber ?? "") !== number(card.number)) {
    return held("PRINTED_IDENTITY_MISMATCH");
  }

  const name = label(card.name), subject = label(cert.subject);
  if (!name) return held("PRINTED_IDENTITY_MISMATCH");
  let subjectFinish: "holo" | "normal" | null = null;
  if (subject !== name) {
    const forms = [["HOLO", "holo"], ["NON-HOLO", "normal"], ["NON HOLO", "normal"], ["NORMAL", "normal"]] as const;
    const match = forms.find(([suffix]) => subject === `${name}-${suffix}` || subject === `${name} ${suffix}`);
    if (!match) return held("PRINTED_IDENTITY_MISMATCH");
    subjectFinish = match[1];
  }

  // Explicit edition only. In particular, a blank variety is not Unlimited.
  const variety = label(cert.variety);
  const editions = [["1ST EDITION", "first_edition"], ["FIRST EDITION", "first_edition"],
    ["UNLIMITED", "unlimited"], ["UNLIMITED EDITION", "unlimited"]] as const;
  const finishes = [["HOLO", "holo"], ["NON-HOLO", "normal"], ["NON HOLO", "normal"], ["NORMAL", "normal"]] as const;
  const candidates: { edition: string; finish: "holo" | "normal" | null }[] = [];
  for (const [editionLabel, edition] of editions) {
    if (variety === editionLabel) candidates.push({ edition, finish: null });
    for (const [finishLabel, finish] of finishes) {
      if ([`${editionLabel} ${finishLabel}`, `${finishLabel} ${editionLabel}`, `${finishLabel}-${editionLabel}`].includes(variety)) {
        candidates.push({ edition, finish });
      }
    }
  }
  if (candidates.length !== 1 || candidates[0].edition !== option.edition) return held("EDITION_UNCONFIRMED_OR_MISMATCHED");
  const varietyFinish = candidates[0].finish;
  if (subjectFinish && varietyFinish && subjectFinish !== varietyFinish) return held("FINISH_CONFLICT");
  if ((subjectFinish ?? varietyFinish) !== option.finish_key) return held("FINISH_UNCONFIRMED_OR_MISMATCHED");
  return { status: "matched", option, certNumber: cert.certNumber, grade: verified.grade };
}
