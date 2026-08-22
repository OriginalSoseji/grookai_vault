import Image from "next/image";
import Link from "next/link";
import { formatVaultInstancePrice } from "@/lib/vaultInstancePricing";

function getInitials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "GV";
}

export default function VendorOfferSummary({
  askingPriceAmount,
  askingPriceCurrency,
  askingPriceNote,
  conditionLabel,
  vendorDisplayName,
  vendorSlug,
  vendorAvatarUrl,
}: {
  askingPriceAmount: number;
  askingPriceCurrency: string | null;
  askingPriceNote: string | null;
  conditionLabel: string | null;
  vendorDisplayName: string;
  vendorSlug: string;
  vendorAvatarUrl: string | null;
}) {
  return (
    <section
      aria-labelledby="vendor-price-heading"
      className="overflow-hidden rounded-[1rem] border border-emerald-200 bg-white shadow-sm dark:border-emerald-900/70 dark:bg-slate-950"
    >
      <div className="grid gap-0 md:grid-cols-[minmax(0,1fr)_minmax(260px,0.7fr)]">
        <div className="bg-emerald-950 px-5 py-5 text-white sm:px-7 sm:py-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p id="vendor-price-heading" className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200">
              Vendor price
            </p>
            <span className="rounded-full border border-emerald-600 bg-emerald-900 px-3 py-1 text-xs font-semibold text-emerald-100">
              Available
            </span>
          </div>
          <p
            className="mt-3 text-4xl font-semibold text-white sm:text-5xl"
            data-vendor-price="true"
            data-price-source="vendor_asking_price"
          >
            {formatVaultInstancePrice(askingPriceAmount, askingPriceCurrency)}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-emerald-50">
            <span className="font-medium">Condition</span>
            <span className="rounded-full bg-white/10 px-3 py-1.5">
              {conditionLabel ?? "Not specified"}
            </span>
          </div>
          {askingPriceNote ? <p className="mt-4 max-w-2xl text-sm text-emerald-100">{askingPriceNote}</p> : null}
        </div>

        <div className="flex items-center gap-4 px-5 py-5 sm:px-7">
          <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
            {vendorAvatarUrl ? (
              <Image
                src={vendorAvatarUrl}
                alt={`${vendorDisplayName} profile photo`}
                fill
                sizes="56px"
                className="object-cover"
              />
            ) : (
              <span aria-hidden="true">{getInitials(vendorDisplayName)}</span>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Offered by</p>
            <p className="mt-1 truncate text-lg font-semibold text-slate-950 dark:text-white">{vendorDisplayName}</p>
            <Link
              href={`/u/${encodeURIComponent(vendorSlug)}`}
              className="mt-2 inline-flex text-sm font-medium text-emerald-700 underline-offset-4 hover:underline dark:text-emerald-300"
            >
              View vendor Wall
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
