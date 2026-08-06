import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  isReleaseConvergenceScenario,
  ReleaseConvergenceScenario,
} from "@/components/visualParity/ReleaseConvergenceScenario";
import { isLocalVisualParityFixtureMode } from "@/lib/visualParity/fixtureMode";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Local release convergence fixture",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default async function ReleaseConvergenceFixturePage({
  params,
}: {
  params: Promise<{ scenario: string }>;
}) {
  const { scenario } = await params;
  if (!isLocalVisualParityFixtureMode() || !isReleaseConvergenceScenario(scenario)) {
    notFound();
  }

  return <ReleaseConvergenceScenario scenario={scenario} />;
}
