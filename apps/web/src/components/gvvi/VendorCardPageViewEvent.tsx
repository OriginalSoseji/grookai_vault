"use client";

import { useEffect } from "react";
import { sendTelemetryEvent } from "@/lib/telemetry/client";

export default function VendorCardPageViewEvent({
  gvviId,
  gvId,
  vendorSlug,
}: {
  gvviId: string;
  gvId: string;
  vendorSlug: string;
}) {
  useEffect(() => {
    sendTelemetryEvent({
      eventName: "vendor_card_page_view",
      path: `/gvvi/${encodeURIComponent(gvviId)}`,
      gvId,
      metadata: {
        contract_version: "GVVI_VENDOR_QR_V1",
        gvvi_id: gvviId,
        vendor_slug: vendorSlug,
      },
    });
  }, [gvId, gvviId, vendorSlug]);

  return null;
}
