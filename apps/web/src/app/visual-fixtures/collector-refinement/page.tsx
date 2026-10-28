import { headers } from "next/headers";
import { notFound } from "next/navigation";
import CollectorRefinementFixture from "@/components/visualParity/CollectorRefinementFixture";
import { isLocalVisualParityFixtureMode } from "@/lib/visualParity/fixtureMode";
export const dynamic = "force-dynamic";
export default async function CollectorRefinementFixturePage(
  { searchParams }: { searchParams: Promise<{ view?: string }> },
) {
  if (!isLocalVisualParityFixtureMode()) notFound();
  const { view = "card" } = await searchParams;
  const host = (await headers()).get("host") ?? "127.0.0.1:3100";
  if (!/^(127[.]0[.]0[.]1|localhost)(:\d+)?$/.test(host)) notFound();
  return (
    <CollectorRefinementFixture
      view={view}
      origin={`http://${host}`}
      addAction={async (_, form) => {
        "use server";
        return {
          ok: true,
          status: "added",
          quantity: Number(form.get("quantity")),
          gvvi_id: "GVVI-FIXTURE-000001",
          submissionKey: Date.now(),
        };
      }}
      slabAction={async () => {
        "use server";
        return {
          ok: false,
          status: "validation-error",
          message:
            "Sample preview: certification is verified in the signed-in app.",
          submissionKey: Date.now(),
        };
      }}
    />
  );
}
