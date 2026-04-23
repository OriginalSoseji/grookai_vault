import PublicSetsToolbar from "@/components/sets/PublicSetsToolbar";
import PageIntro from "@/components/layout/PageIntro";
import PageSection from "@/components/layout/PageSection";
import PublicSetsResults from "@/components/sets/PublicSetsResults";
import { getSetLogoAssetPathMap } from "@/lib/setLogoAssets";
import { getPublicSets } from "@/lib/publicSets";

export const dynamic = "force-static";
export const revalidate = 300;

export default async function SetsPage() {
  const sets = await getPublicSets();
  const setLogoPathByCode = await getSetLogoAssetPathMap(sets.map((setInfo) => setInfo.code));

  return (
    <div className="space-y-8 py-6">
      <PageIntro
        eyebrow="Public Sets"
        title="Browse Pokemon sets"
        description="Browse Pokemon sets collectors care about."
      />

      <PageSection spacing="loose">
        <PublicSetsToolbar />
        <PublicSetsResults sets={sets} logoEntries={[...setLogoPathByCode.entries()]} />
      </PageSection>
    </div>
  );
}
