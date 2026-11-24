// An absolute source timestamp stays meaningful for old prices and renders
// identically on the server and client. Publication time is not source age.
export function formatMarketPriceUpdatedAt(value: string | null | undefined) {
  if (!value || !Number.isFinite(Date.parse(value))) return "Update time unavailable";
  return `Last updated ${new Intl.DateTimeFormat("en-US", {
    year: "numeric", month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit", timeZone: "UTC", timeZoneName: "short",
  }).format(new Date(value))}`;
}
