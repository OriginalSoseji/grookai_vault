import { notFound } from "next/navigation";
import TrackPageEvent from "@/components/telemetry/TrackPageEvent";
import PublicSetCardGrid from "@/components/PublicSetCardGrid";
import { getPublicSetByCode, getPublicSetCards } from "@/lib/publicSets";
import { getPublicSetMasterSetStats } from "@/lib/publicSetMasterSetStats";
import { applyOwnedPrintingCountsToSetCards } from "@/lib/publicSetsOwnership";
import { createServerComponentClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
const INITIAL_CARD_CHUNK = 36;

export default async function SetPage({
  params,
}: {
  params: { set_code: string };
}) {
  const supabase = createServerComponentClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [setDetail, initialCards] = await Promise.all([
    getPublicSetByCode(params.set_code),
    getPublicSetCards(params.set_code, 0, INITIAL_CARD_CHUNK),
  ]);

  if (!setDetail) {
    notFound();
  }

  const masterSetStats = await getPublicSetMasterSetStats(setDetail.code, user?.id ?? null);

  return (
    <div className="space-y-8 py-6">
      <TrackPageEvent eventName="page_view_set" path={`/sets/${setDetail.code}`} setCode={setDetail.code} />
      <section className="space-y-5 rounded-[16px] border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <div className="space-y-4">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">Public Set</p>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-950">{setDetail.name}</h1>
          <p className="text-sm leading-7 text-slate-600">
            {[
              setDetail.code,
              typeof setDetail.release_year === "number" ? String(setDetail.release_year) : undefined,
              typeof setDetail.printed_total === "number" ? `${setDetail.printed_total} printed cards` : undefined,
              `${masterSetStats.variantOptionCount} master set options`,
            ]
              .filter(Boolean)
              .join(" • ")}
          </p>
        </div>

        <div className="grid gap-3 border-t border-slate-100 pt-5 sm:grid-cols-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Card Prints</p>
            <p className="mt-1 text-2xl font-semibold text-slate-950">{masterSetStats.parentPrintCount}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Master Set</p>
            <p className="mt-1 text-2xl font-semibold text-slate-950">{masterSetStats.variantOptionCount}</p>
            <p className="mt-1 text-xs text-slate-500">Includes finish and parallel options.</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Owned</p>
            {masterSetStats.ownedVariantOptionCount === null ? (
              <p className="mt-1 text-sm font-medium text-slate-600">Sign in for master set progress.</p>
            ) : (
              <>
                <p className="mt-1 text-2xl font-semibold text-slate-950">
                  {masterSetStats.ownedVariantOptionCount}/{masterSetStats.variantOptionCount}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {masterSetStats.completionPercent}% complete
                  {masterSetStats.unclassifiedOwnedCount > 0
                    ? ` • ${masterSetStats.unclassifiedOwnedCount} owned copies need finish selection`
                    : ""}
                </p>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <PublicSetCardGrid
          setCode={setDetail.code}
          initialCards={await applyOwnedPrintingCountsToSetCards(initialCards, user?.id ?? null)}
          totalCount={setDetail.card_count}
          chunkSize={INITIAL_CARD_CHUNK}
        />
      </section>
    </div>
  );
}
