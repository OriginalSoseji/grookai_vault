export type CollectorAcquisition = {
  acquired_on: string;
  acquired_at: string;
  acquired_utc_offset_minutes: number;
};
export function localCollectorToday(): string {
  const now = new Date();
  return [String(now.getFullYear()).padStart(4, "0"), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("-");
}
export function localCollectorAcquisition(day: string): CollectorAcquisition | null {
  if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(day)) return null;
  const [year, month, date] = day.split("-").map(Number);
  const local = new Date(0);
  local.setFullYear(year, month - 1, date);
  local.setHours(0, 0, 0, 0);
  if (local.getFullYear() !== year || local.getMonth() !== month - 1 || local.getDate() !== date) return null;
  return {acquired_on: day, acquired_at: local.toISOString(), acquired_utc_offset_minutes: -local.getTimezoneOffset()};
}
export function isCollectorAcquisition(value: unknown): value is CollectorAcquisition {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<CollectorAcquisition>;
  if (typeof v.acquired_on !== "string" || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(v.acquired_on) ||
      typeof v.acquired_at !== "string" || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}([.][0-9]{1,6})?Z$/.test(v.acquired_at) ||
      typeof v.acquired_utc_offset_minutes !== "number" || !Number.isInteger(v.acquired_utc_offset_minutes) || Math.abs(v.acquired_utc_offset_minutes) > 840) return false;
  const instant = Date.parse(v.acquired_at);
  if (!Number.isFinite(instant) || v.acquired_on.startsWith("0000-") || new Date(instant).toISOString().slice(0, 19) !== v.acquired_at.slice(0, 19)) return false;
  const civil = new Date(instant + v.acquired_utc_offset_minutes * 60_000);
  return civil.toISOString().slice(0, 10) === v.acquired_on;
}
