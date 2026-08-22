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
