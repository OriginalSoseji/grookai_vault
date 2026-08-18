import { notFound } from "next/navigation";
import VendorOfferSummary from "@/components/gvvi/VendorOfferSummary";
import VendorQrManagementCard from "@/components/gvvi/VendorQrManagementCard";
import VaultExactCopyHero from "@/components/vault/VaultExactCopyHero";
import { renderVendorQrSvg, svgToDataUrl } from "@/lib/gvvi/vendorQr";
import { isLocalVisualParityFixtureMode } from "@/lib/visualParity/fixtureMode";

export const dynamic = "force-dynamic";

export default async function GvviVendorQrVisualFixturePage() {
  if (!isLocalVisualParityFixtureMode()) {
    notFound();
  }

  const gvviId = "GVVI-VENDOR1-000042";
  const destinationUrl = `https://grookaivault.com/q/${gvviId}`;
  const qrDataUrl = svgToDataUrl(await renderVendorQrSvg(gvviId));

  return (
    <div className="space-y-6 py-6 md:space-y-8 md:py-7" data-gvvi-vendor-fixture-root>
      <VaultExactCopyHero
        eyebrow="Vendor card"
        cardName="Pikachu Illustration Rare"
        setName="Paldea Evolved"
        setCode="PAL"
        number="203/193"
        gvId="GV-PK-PAL-203"
        gvviId={gvviId}
        primaryImageUrl={null}
        fallbackImageUrl={null}
        fallbackImageUrls={[]}
        finishLabel="Holofoil"
        conditionLabel="NM"
        isGraded={false}
        grader={null}
        grade={null}
        certNumber={null}
        statusLabel="Available"
        intentLabel="Sell"
        contextLabel="Offered by Fixture Vendor"
        featuredContent={
          <VendorOfferSummary
            askingPriceAmount={32}
            askingPriceCurrency="USD"
            askingPriceNote="Price shown is the vendor's current asking price."
            conditionLabel="NM"
            vendorDisplayName="Fixture Vendor"
            vendorSlug="fixture-vendor"
            vendorAvatarUrl={null}
          />
        }
        actions={null}
        evidence={<p>Public vendor GVVI fixture</p>}
      />
      <VendorQrManagementCard
        gvviId={gvviId}
        qrDataUrl={qrDataUrl}
        destinationUrl={destinationUrl}
      />
    </div>
  );
}
