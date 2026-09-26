// Each pilot build is bound to one isolated database and one exact HTTPS origin.
export const vendorPilot = process.env.NEXT_PUBLIC_VENDOR_PILOT === "true";
export const vendorDeviceQa = process.env.NEXT_PUBLIC_VENDOR_DEVICE_QA === "true";
if (vendorDeviceQa && !vendorPilot) throw new Error("Device QA requires the isolated vendor pilot.");
export const VENDOR_PILOT_ORIGIN = vendorDeviceQa
  ? "https://grookai-vendor-device-qa.vercel.app"
  : "https://grookai-vendor-preview.vercel.app";
export const VENDOR_PILOT_DATABASE = "https://hrtbjchobencariqclab.supabase.co";
export const VENDOR_PILOT_COOKIE = "grookai_vendor_pilot";
export function validPilotCode(code) { return typeof code === "string" && /^[a-f0-9]{64}$/.test(code); }
