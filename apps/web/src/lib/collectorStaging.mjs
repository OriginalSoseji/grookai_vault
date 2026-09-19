export const collectorStaging = process.env.NEXT_PUBLIC_COLLECTOR_STAGING === "true";
export const collectorFixtureLab = process.env.NEXT_PUBLIC_COLLECTOR_FIXTURE_LAB === "true";
export const collectorHostedStaging = process.env.NEXT_PUBLIC_COLLECTOR_HOSTED_STAGING === "true";
export const storefrontLocalTest = process.env.NEXT_PUBLIC_STOREFRONT_LOCAL_TEST === "true";

export function assertCollectorStagingTarget(url, fixtureLab = collectorFixtureLab, hosted = collectorHostedStaging) {
  const target = new URL(url);
  if (storefrontLocalTest && (fixtureLab || hosted)) throw new Error("Storefront local tests cannot share another staging mode.");
  if (fixtureLab && hosted) throw new Error("Fixture and hosted staging are mutually exclusive.");
  const expected = storefrontLocalTest ? "http://127.0.0.1:15439" : hosted ? "https://hcdpcbpnnvtbaezefjkd.supabase.co"
    : fixtureLab ? "http://127.0.0.1:54361" : "http://127.0.0.1:54321";
  if (target.origin !== expected || target.username || target.password || target.search || target.hash) {
    throw new Error("Authenticated collector staging requires its exact verified database.");
  }
  if (target.pathname !== "/") throw new Error("Unexpected staging database path.");
}
