import { vendorPilot, VENDOR_PILOT_DATABASE } from "./vendorPilot.mjs";
export const collectorStaging = process.env.NEXT_PUBLIC_COLLECTOR_STAGING === "true";
export const collectorFixtureLab = process.env.NEXT_PUBLIC_COLLECTOR_FIXTURE_LAB === "true";
export const collectorHostedStaging = process.env.NEXT_PUBLIC_COLLECTOR_HOSTED_STAGING === "true";
export const storefrontLocalTest = process.env.NEXT_PUBLIC_STOREFRONT_LOCAL_TEST === "true";
export const vendorBatchLocalTest = process.env.NEXT_PUBLIC_VENDOR_BATCH_LOCAL_TEST === "true";
export const collectrImportLocalTest = process.env.NEXT_PUBLIC_COLLECTR_IMPORT_LOCAL_TEST === "true";

export function assertCollectorStagingTarget(url, fixtureLab = collectorFixtureLab, hosted = collectorHostedStaging) {
  const target = new URL(url);
  if (collectrImportLocalTest && (vendorPilot || fixtureLab || hosted || storefrontLocalTest || vendorBatchLocalTest)) throw new Error("Collectr import proof requires its own retained local database.");
  if (vendorBatchLocalTest && (vendorPilot || fixtureLab || hosted || storefrontLocalTest)) throw new Error("Batch intake proof requires its own local database.");
  if (vendorPilot && (fixtureLab || hosted || storefrontLocalTest)) throw new Error("Vendor pilot cannot share another staging mode.");
  if (storefrontLocalTest && (fixtureLab || hosted)) throw new Error("Storefront local tests cannot share another staging mode.");
  if (fixtureLab && hosted) throw new Error("Fixture and hosted staging are mutually exclusive.");
  const expected = vendorBatchLocalTest ? (["http://127.0.0.1:27621", "http://127.0.0.1:29021", "http://127.0.0.1:29421", "http://127.0.0.1:30221", "http://127.0.0.1:31021"].includes(target.origin) ? target.origin : "http://127.0.0.1:26421") : vendorPilot ? VENDOR_PILOT_DATABASE : storefrontLocalTest ? "http://127.0.0.1:15439" : hosted ? "https://hcdpcbpnnvtbaezefjkd.supabase.co"
    : fixtureLab ? "http://127.0.0.1:54361" : "http://127.0.0.1:54321";
  const allowed = collectrImportLocalTest ? "http://127.0.0.1:58541" : expected;
  if (target.origin !== allowed || target.username || target.password || target.search || target.hash) {
    throw new Error("Authenticated collector staging requires its exact verified database.");
  }
  if (target.pathname !== "/") throw new Error("Unexpected staging database path.");
}
