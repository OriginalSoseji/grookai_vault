import type { CardPrinting } from "@/types/cards";

type PrintingReferenceLike = Pick<Partial<CardPrinting>, "id" | "printing_gv_id">;

function normalizePrintingReference(value?: string | null) {
  return (value ?? "").trim();
}

export function getPrintingPublicReference(printing?: PrintingReferenceLike | null) {
  return normalizePrintingReference(printing?.printing_gv_id) || normalizePrintingReference(printing?.id) || null;
}

export function isPrintingReferenceMatch(printing: PrintingReferenceLike, reference?: string | null) {
  const normalizedReference = normalizePrintingReference(reference);
  if (!normalizedReference) {
    return false;
  }

  return (
    normalizePrintingReference(printing.id) === normalizedReference ||
    normalizePrintingReference(printing.printing_gv_id) === normalizedReference
  );
}

export function findPrintingByReference(printings: CardPrinting[] = [], reference?: string | null) {
  if (!normalizePrintingReference(reference)) {
    return null;
  }

  return printings.find((printing) => isPrintingReferenceMatch(printing, reference)) ?? null;
}
