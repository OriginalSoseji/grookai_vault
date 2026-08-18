import { NextResponse } from "next/server";
import { normalizePublicGvviId } from "@/lib/gvvi/vendorQrCore";
import { getPublicVaultInstanceByGvvi } from "@/lib/vault/getPublicVaultInstanceByGvvi";

const PRIVATE_NO_STORE_HEADERS = {
  "cache-control": "private, no-store",
  "x-content-type-options": "nosniff",
};

function hiddenResponse() {
  return new NextResponse("Not found", {
    status: 404,
    headers: PRIVATE_NO_STORE_HEADERS,
  });
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ gvvi_id: string }> },
) {
  const { gvvi_id: rawGvviId } = await context.params;
  const gvviId = normalizePublicGvviId(rawGvviId);
  if (!gvviId) {
    return hiddenResponse();
  }

  const detail = await getPublicVaultInstanceByGvvi(gvviId);
  if (!detail?.isVendorOffer) {
    return hiddenResponse();
  }

  return NextResponse.json(
    {
      schema_version: "GVVI_VENDOR_OFFER_PUBLIC_V1",
      gvvi_id: detail.gvviId,
      vendor: {
        slug: detail.ownerSlug,
        display_name: detail.ownerDisplayName,
        avatar_url: detail.ownerAvatarUrl,
      },
      offer: {
        asking_price_amount: detail.askingPriceAmount,
        asking_price_currency: detail.askingPriceCurrency ?? "USD",
        condition_label: detail.conditionLabel,
        availability: "available",
      },
    },
    { headers: PRIVATE_NO_STORE_HEADERS },
  );
}
