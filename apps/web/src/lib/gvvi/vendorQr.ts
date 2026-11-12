import "server-only";

import QRCode from "qrcode";
import { getSiteOrigin } from "@/lib/getSiteOrigin";
import { buildVendorQrDestinationUrl } from "@/lib/gvvi/vendorQrCore";

export function getVendorQrDestinationUrl(gvviId: string) {
  return buildVendorQrDestinationUrl(getSiteOrigin(), gvviId);
}

export async function renderVendorQrSvg(gvviId: string) {
  return QRCode.toString(getVendorQrDestinationUrl(gvviId), {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 2,
    width: 768,
    color: {
      dark: "#020617",
      light: "#ffffff",
    },
  });
}

export function svgToDataUrl(svg: string) {
  return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
}

// Label pixels are separate from screen QR styling. Match the qualified P21
// four-module quiet zone and integral 203-dpi modules at physical print size.
export async function renderVendorLabelQr(gvviId: string) {
  const destination = getVendorQrDestinationUrl(gvviId);
  const modules = QRCode.create(destination, {errorCorrectionLevel: "L"}).modules.size + 8;
  if (Math.floor(96 / modules) < 2) throw new Error("The QR is too dense for a 14 × 40 mm label.");
  const svg = await QRCode.toString(destination, {type: "svg", errorCorrectionLevel: "L", margin: 4, width: modules * 2, color: {dark: "#000000", light: "#ffffff"}});
  return {qr: svgToDataUrl(svg), qrModules: modules};
}
