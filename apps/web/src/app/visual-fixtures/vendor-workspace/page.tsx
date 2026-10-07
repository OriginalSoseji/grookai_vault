import { notFound } from "next/navigation";
import { isLocalVisualParityFixtureMode } from "@/lib/visualParity/fixtureMode";
import VendorWorkspaceFixture from "./VendorWorkspaceFixture";

export const dynamic = "force-dynamic";
export default function FixturePage() {
  if (!isLocalVisualParityFixtureMode()) notFound();
  return <VendorWorkspaceFixture />;
}
