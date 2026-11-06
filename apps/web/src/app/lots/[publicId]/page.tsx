import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LotSaleForm from "@/components/lotLabels/LotSaleForm";
import PageIntro from "@/components/layout/PageIntro";
import PageSection from "@/components/layout/PageSection";
import { getPublicLotLabel } from "@/lib/lotLabels/getPublicLotLabel";
import { getSiteOrigin } from "@/lib/getSiteOrigin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(props: { params: Promise<{ publicId: string }> }): Promise<Metadata> {
  const { publicId } = await props.params;
  const lot = await getPublicLotLabel(publicId);
  if (!lot) return { title: "Lot not found | grookai vault" };
  return {
    title: `${lot.name} lot | grookai vault`,
    description: `Track sales for the ${lot.name} lot on grookai vault.`,
    alternates: { canonical: `${getSiteOrigin()}/lots/${encodeURIComponent(lot.publicId)}` },
  };
}

export default async function PublicLotLabelPage(props: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await props.params;
  const lot = await getPublicLotLabel(publicId);
  if (!lot) notFound();

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 py-8">
      <PageIntro eyebrow="Lot label" title={lot.name} description="This QR belongs to a sale lot. Record the sale here without needing a canonical card match." size="compact" />
      <PageSection surface="card" spacing="loose">
        <div className="flex items-center justify-between gap-4">
          <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">grookai vault</p><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Lot link active · exact card identity optional</p></div>
          <span className="rounded-full bg-lime-100 px-3 py-1 text-xs font-semibold text-lime-900 dark:bg-lime-950 dark:text-lime-200">Lot record</span>
        </div>
      </PageSection>
      <LotSaleForm publicId={lot.publicId} />
    </main>
  );
}
