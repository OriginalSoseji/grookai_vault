import Image from "next/image";
import Link from "next/link";
import CopyButton from "@/components/CopyButton";
import PageSection from "@/components/layout/PageSection";
import SectionHeader from "@/components/layout/SectionHeader";

export default function VendorQrManagementCard({
  gvviId,
  qrDataUrl,
  destinationUrl,
}: {
  gvviId: string;
  qrDataUrl: string;
  destinationUrl: string;
}) {
  const encodedGvviId = encodeURIComponent(gvviId);
  return (
    <PageSection surface="card" spacing="compact" className="px-4 py-4 sm:px-5">
      <SectionHeader
        title="Physical card QR"
        description="This QR stays the same when you change the price, condition, or profile image."
      />
      <div className="grid gap-4 rounded-[1rem] border border-slate-200 bg-white p-4 sm:grid-cols-[160px_minmax(0,1fr)]">
        <Image
          src={qrDataUrl}
          alt={`QR code for vendor card ${gvviId}`}
          width={160}
          height={160}
          unoptimized
          className="h-40 w-40 border border-slate-200 bg-white"
        />
        <div className="min-w-0 space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Persistent destination</p>
            <p className="mt-1 break-all text-sm text-slate-700">{destinationUrl}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <CopyButton text={destinationUrl} label="Copy QR link" copiedLabel="QR link copied!" />
            <a
              href={`/api/gvvi/${encodedGvviId}/qr?download=1`}
              className="gv-secondary-button"
            >
              Download SVG
            </a>
            <Link href={`/vault/gvvi/${encodedGvviId}/qr`} className="gv-secondary-button">
              Print card
            </Link>
          </div>
        </div>
      </div>
    </PageSection>
  );
}
