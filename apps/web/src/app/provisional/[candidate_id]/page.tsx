import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import PublicCardImage from "@/components/PublicCardImage";
import { buildPublicProvisionalDetailModel } from "@/lib/provisional/buildPublicProvisionalDetailModel";
import {
  buildProvisionalContinuityRedirectHref,
  getProvisionalPromotionContinuity,
} from "@/lib/provisional/getProvisionalPromotionContinuity";

export const revalidate = 0;
export const dynamic = "force-dynamic";
export const dynamicParams = true;

export async function generateMetadata({
  params,
}: {
  params: { candidate_id: string };
}): Promise<Metadata> {
  const continuity = await getProvisionalPromotionContinuity(params.candidate_id);
  const card = continuity.kind === "provisional" ? continuity.candidate : null;

  return {
    title: card ? `${card.display_name} | Provisional | Grookai Vault` : "Provisional card unavailable | Grookai Vault",
    robots: {
      index: false,
      follow: false,
    },
  };
}

// LOCK: This page is a trust-safe provisional surface.
// LOCK: Do not add vault, pricing, provenance, ownership, or GV-ID here.
// LOCK: Promoted provisional routes must continue to canonical truth when explicit linkage exists.
// LOCK: Do not keep promoted rows alive as non-canonical detail pages.
export default async function ProvisionalCardPage({
  params,
}: {
  params: { candidate_id: string };
}) {
  const continuity = await getProvisionalPromotionContinuity(params.candidate_id);
  const redirectHref = buildProvisionalContinuityRedirectHref(continuity);
  if (redirectHref) {
    redirect(redirectHref);
  }

  const model =
    continuity.kind === "provisional"
      ? buildPublicProvisionalDetailModel(continuity.candidate)
      : null;
  if (!model) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-6xl px-5 py-8 md:px-8 md:py-12">
      <div className="space-y-6">
        <Link
          href="/explore"
          className="inline-flex text-sm font-medium text-slate-500 underline-offset-4 transition hover:text-slate-900 hover:underline"
        >
          Back to Explore
        </Link>

        <section className="overflow-hidden rounded-[8px] border border-slate-200 bg-white shadow-sm">
          <div className="grid gap-8 p-5 md:grid-cols-[minmax(240px,360px)_minmax(0,1fr)] md:p-8 lg:gap-10">
            <div className="mx-auto w-full max-w-[320px] rounded-[8px] border border-slate-100 bg-slate-50 p-4">
              <PublicCardImage
                src={model.image_url ?? undefined}
                alt={model.display_name}
                loading="eager"
                imageClassName="aspect-[3/4] w-full rounded-[8px] bg-white object-contain"
                fallbackClassName="flex aspect-[3/4] w-full items-center justify-center rounded-[8px] bg-white px-6 text-center text-sm text-slate-500"
                fallbackLabel="Image unavailable"
              />
            </div>

            <div className="flex min-w-0 flex-col justify-center space-y-6">
              <div className="space-y-4">
                <span className="inline-flex w-fit rounded-[8px] border border-slate-300 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
                  {model.display_label}
                </span>

                <div className="space-y-2">
                  <h1 className="text-3xl font-semibold tracking-tight text-slate-950 md:text-5xl">
                    {model.display_name}
                  </h1>
                  <p className="text-sm text-slate-600 md:text-base">{model.identity_line}</p>
                </div>
              </div>

              <div className="max-w-xl space-y-3 text-sm leading-6 text-slate-600">
                <p>{model.trust_copy}</p>
                <p>{model.catalog_copy}</p>
                {model.source_label ? <p className="text-xs text-slate-500">{model.source_label}</p> : null}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
