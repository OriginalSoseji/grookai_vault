import { notFound } from "next/navigation";
import Link from "next/link";
import CompareTray from "@/components/compare/CompareTray";
import { MobileParityDock } from "@/components/mobileParity/MobileParityDock";
import { normalizeCompareCardsParam } from "@/lib/compareCards";
import { isLocalVisualParityFixtureMode } from "@/lib/visualParity/fixtureMode";

export const dynamic = "force-dynamic";

export default async function CompareDockFixture({ searchParams }: {
  searchParams: Promise<{ cards?: string; dock?: string; shell?: string }>;
}) {
  if (!isLocalVisualParityFixtureMode()) notFound();
  const params = await searchParams;
  return (
    <div className={params.shell === "legacy" ? "" : "gv-collector"}>
      <main className="p-6">
        <h1>Compare tray layout fixture</h1>
        <p>UI controls only. No catalog or account data is loaded.</p>
        <input aria-label="Search fixture" className="border" />
        <Link href={`/visual-fixtures/compare-dock?dock=off&cards=${encodeURIComponent(params.cards ?? "")}`}>Hide navigation</Link>
      </main>
      {params.dock === "off" ? null : <MobileParityDock activeKey="search" />}
      <CompareTray cards={normalizeCompareCardsParam(params.cards)} addHref="/visual-fixtures/compare-dock?adding=1" />
    </div>
  );
}
