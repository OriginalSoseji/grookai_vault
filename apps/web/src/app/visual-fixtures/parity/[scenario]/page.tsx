import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { VisualParityScenario } from "@/components/visualParity/VisualParityScenario";
import { isMobileParityScenario } from "@/lib/mobileParity/shellManifest";
import { isLocalVisualParityFixtureMode } from "@/lib/visualParity/fixtureMode";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Local mobile parity fixture",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function VisualParityFixturePage({
  params,
}: {
  params: { scenario: string };
}) {
  if (
    !isLocalVisualParityFixtureMode() ||
    !isMobileParityScenario(params.scenario)
  ) {
    notFound();
  }

  return <VisualParityScenario scenario={params.scenario} />;
}
