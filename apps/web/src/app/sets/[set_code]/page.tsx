import { notFound } from "next/navigation";
import PublicSetCardGrid from "@/components/PublicSetCardGrid";
import { getPublicSetByCode, getPublicSetCards } from "@/lib/publicSets";

export const dynamic = "force-dynamic";
const INITIAL_CARD_CHUNK = 36;

export default async function SetPage({
  params,
}: {
  params: { set_code: string };
}) {
  const [setDetail, initialCards] = await Promise.all([
    getPublicSetByCode(params.set_code),
    getPublicSetCards(params.set_code, 0, INITIAL_CARD_CHUNK),
  ]);

  if (!setDetail) {
    notFound();
  }

  return (
    <div className="space-y-8 py-6">
      <section className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">Public Set</p>
        <h1 className="text-4xl font-semibold tracking-tight text-slate-950">{setDetail.name}</h1>
        <p className="text-sm text-slate-600">
          {[
            setDetail.code,
            typeof setDetail.release_year === "number" ? String(setDetail.release_year) : undefined,
            typeof setDetail.printed_total === "number" ? `${setDetail.printed_total} cards` : undefined,
          ]
            .filter(Boolean)
            .join(" • ")}
        </p>
      </section>

      <section className="space-y-4">
        <PublicSetCardGrid
          setCode={setDetail.code}
          initialCards={initialCards}
          totalCount={setDetail.card_count}
          chunkSize={INITIAL_CARD_CHUNK}
        />
      </section>
    </div>
  );
}
