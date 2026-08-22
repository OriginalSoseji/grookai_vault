import "server-only";

import type { User } from "@supabase/supabase-js";
import type { NextRequest, NextResponse } from "next/server";
import {
  GVVI_REFERRAL_COOKIE_NAME,
  GVVI_REFERRAL_WINDOW_SECONDS,
  sealVendorReferralContext,
  shouldCreditVendorReferral,
  unsealVendorReferralContext,
} from "@/lib/gvvi/vendorQrCore";
import { trackServerEvent } from "@/lib/telemetry/trackServerEvent";
import { getPublicVaultInstanceByGvvi } from "@/lib/vault/getPublicVaultInstanceByGvvi";

function getReferralSecret() {
  const secret = process.env.GVVI_REFERRAL_COOKIE_SECRET?.trim();
  return secret && secret.length >= 32 ? secret : null;
}

export function clearVendorReferralCookie(response: NextResponse) {
  response.cookies.set(GVVI_REFERRAL_COOKIE_NAME, "", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
  });
}

export function setVendorReferralCookie(response: NextResponse, gvviId: string) {
  const secret = getReferralSecret();
  if (!secret) {
    console.warn("[gvvi-referral] attribution disabled because GVVI_REFERRAL_COOKIE_SECRET is unavailable");
    return false;
  }

  try {
    response.cookies.set(
      GVVI_REFERRAL_COOKIE_NAME,
      sealVendorReferralContext({ gvviId, secret }),
      {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: GVVI_REFERRAL_WINDOW_SECONDS,
      },
    );
    return true;
  } catch (error) {
    console.error("[gvvi-referral] failed to create attribution context", { gvviId, error });
    return false;
  }
}

export type VendorReferralConsumeResult =
  | "no_context"
  | "invalid_context"
  | "not_new_account"
  | "vendor_offer_unavailable"
  | "self_referral_blocked"
  | "credited"
  | "credit_failed";

export async function consumeVendorReferralAttribution(input: {
  request: NextRequest;
  response: NextResponse;
  user: Pick<User, "id">;
  accountWasCreated: boolean;
}): Promise<VendorReferralConsumeResult> {
  const token = input.request.cookies.get(GVVI_REFERRAL_COOKIE_NAME)?.value;
  if (!token) {
    return "no_context";
  }

  clearVendorReferralCookie(input.response);
  const secret = getReferralSecret();
  if (!secret) {
    return "invalid_context";
  }

  const context = unsealVendorReferralContext({ token, secret });
  if (!context) {
    return "invalid_context";
  }

  if (!input.accountWasCreated) {
    return "not_new_account";
  }

  const detail = await getPublicVaultInstanceByGvvi(context.gvviId);
  if (!detail?.isVendorOffer) {
    return "vendor_offer_unavailable";
  }

  if (!shouldCreditVendorReferral({
    accountWasCreated: true,
    referredVendorUserId: detail.ownerUserId,
    newUserId: input.user.id,
  })) {
    return "self_referral_blocked";
  }

  const eventResult = await trackServerEvent({
    eventName: "vendor_referred_signup",
    userId: input.user.id,
    path: `/gvvi/${encodeURIComponent(detail.gvviId)}`,
    gvId: detail.gvId,
    metadata: {
      contract_version: "GVVI_VENDOR_QR_V1",
      gvvi_id: detail.gvviId,
      referred_vendor_user_id: detail.ownerUserId,
      referred_vendor_slug: detail.ownerSlug,
      referral_created_at: context.createdAt,
    },
  });

  return eventResult === "inserted" || eventResult === "duplicate"
    ? "credited"
    : "credit_failed";
}
