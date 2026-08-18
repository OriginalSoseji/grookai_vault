import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import PrintVendorQrButton from "@/components/gvvi/PrintVendorQrButton";
import { requireServerUser } from "@/lib/auth/requireServerUser";
import { resolveServerUserEntitlement } from "@/lib/entitlements/resolveServerUserEntitlement";
import { getVendorQrDestinationUrl, renderVendorQrSvg, svgToDataUrl } from "@/lib/gvvi/vendorQr";
import { getPublicVaultInstanceByGvvi } from "@/lib/vault/getPublicVaultInstanceByGvvi";
import { formatVaultInstancePrice } from "@/lib/vaultInstancePricing";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function VendorQrPrintPage(
  props: { params: Promise<{ gvvi_id: string }> },
) {
  const { gvvi_id: gvviId } = await props.params;
  const { user } = await requireServerUser(`/vault/gvvi/${gvviId}/qr`);
  const [entitlement, detail] = await Promise.all([
    resolveServerUserEntitlement(user),
    getPublicVaultInstanceByGvvi(gvviId),
  ]);

  if (
    !entitlement.capabilities.canUseVendorTools ||
    !detail?.isVendorOffer ||
    detail.ownerUserId !== user.id ||
    detail.askingPriceAmount === null
  ) {
    notFound();
  }

  const qrDataUrl = svgToDataUrl(await renderVendorQrSvg(detail.gvviId));
  const destinationUrl = getVendorQrDestinationUrl(detail.gvviId);

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-6 print:max-w-none print:py-0">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Vendor tools</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-950 dark:text-white">Print physical card QR</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/vault/gvvi/${encodeURIComponent(detail.gvviId)}`} className="gv-secondary-button">
            Back to card
          </Link>
          <PrintVendorQrButton />
        </div>
      </div>

      <section
        aria-label={`Printable QR card for ${detail.cardName}`}
        className="mx-auto flex aspect-[5/7] w-[2.5in] flex-col justify-between overflow-hidden rounded-[0.12in] border border-slate-300 bg-white p-[0.14in] text-slate-950 shadow-sm print:shadow-none"
      >
        <div className="min-w-0">
          <p className="text-[8pt] font-bold uppercase tracking-[0.12em] text-emerald-800">Vendor price</p>
          <p className="mt-0.5 text-[19pt] font-bold leading-none">
            {formatVaultInstancePrice(detail.askingPriceAmount, detail.askingPriceCurrency)}
          </p>
          <p className="mt-1 truncate text-[8.5pt] font-semibold">{detail.cardName}</p>
          <p className="truncate text-[7pt] text-slate-600">
            {detail.setCode} #{detail.number} · {detail.conditionLabel ?? "Condition not specified"}
          </p>
        </div>

        <Image
          src={qrDataUrl}
          alt={`QR code linking to ${detail.cardName} from ${detail.ownerDisplayName}`}
          width={260}
          height={260}
          unoptimized
          className="mx-auto h-[1.72in] w-[1.72in]"
        />

        <div className="text-center">
          <p className="truncate text-[8pt] font-semibold">{detail.ownerDisplayName}</p>
          <p className="mt-0.5 text-[6pt] text-slate-500">Scan for the current price and card details</p>
          <p className="mt-1 truncate text-[5.5pt] text-slate-400">{destinationUrl}</p>
        </div>
      </section>
    </div>
  );
}
