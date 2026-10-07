"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import VaultInstancePricingCard from "@/components/vault/VaultInstancePricingCard";

export default function PricingEditorFixture() {
  const [market, setMarket] = useState(100);
  const params = useSearchParams();
  return <div className="mx-auto max-w-xl space-y-4 py-6">
    <Link href="/visual-fixtures/vendor-workspace?view=inventory">Back to sample Inventory</Link>
    <VaultInstancePricingCard instanceId="00000000-0000-4000-8000-000000000011"
      isActive isGraded={params.get("evidence") === "slab"} initialPricingMode="asking"
      initialAskingPriceAmount={80} initialAskingPriceCurrency="CAD" initialAskingPriceNote={null}
      marketReferencePrice={market} marketReferenceSource={params.get("evidence") === "unsupported" ? "ebay" : "tcgplayer"}
      marketReferenceUpdatedAt="2026-10-07T12:00:00Z" marketReferenceObservedAt="2026-10-06T12:00:00Z"
      marketReferencePublishedAt="2026-10-07T12:00:00Z" marketReferenceProvenanceId={params.get("evidence") === "missing" ? null : "sample-publication"}
      cardPrintId="00000000-0000-4000-8000-000000000012" cardPrintingId="00000000-0000-4000-8000-000000000013"
      printingGvId="GV-PK-SAMPLE-001-STD" />
    <button onClick={() => setMarket(125)}>Refresh sample market evidence</button>
  </div>;
}
