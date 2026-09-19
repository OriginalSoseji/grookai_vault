import "server-only";
import { createServerAdminClient } from "@/lib/supabase/admin";
import {
  sealStoreReferralContext,
  unsealReferralContext,
} from "@/lib/stores/storeReferralCore";

import type { User } from "@supabase/supabase-js";
import type { NextRequest, NextResponse } from "next/server";
import {
  GVVI_REFERRAL_COOKIE_NAME,
  GVVI_REFERRAL_WINDOW_SECONDS,
  sealVendorReferralContext,
  shouldCreditVendorReferral,
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

export function setVendorReferralCookie(
  response: NextResponse,
  gvviId: string,
) {
  const secret = getReferralSecret();
  if (!secret) {
    console.warn(
      "[gvvi-referral] attribution disabled because GVVI_REFERRAL_COOKIE_SECRET is unavailable",
    );
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
    console.error("[gvvi-referral] failed to create attribution context", {
      gvviId,
      error,
    });
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

export function setStoreReferralCookie(
  response: NextResponse,
  storeId: string,
) {
  const secret = getReferralSecret();
  if (!secret) return false;
  response.cookies.set(
    GVVI_REFERRAL_COOKIE_NAME,
    sealStoreReferralContext(storeId, secret),
    {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: GVVI_REFERRAL_WINDOW_SECONDS,
    },
  );
  return true;
}

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

  const context = unsealReferralContext(token, secret);
  if (!context) {
    return "invalid_context";
  }

  try {
    // Retain the established public QR eligibility check. accountWasCreated is
    // compatibility telemetry only; the RPC verifies the actual auth user timestamp.
    if (context.version === 1) {
      const detail = await getPublicVaultInstanceByGvvi(context.gvviId);
      if (!detail?.isVendorOffer) return "vendor_offer_unavailable";
      if (
        !shouldCreditVendorReferral({
          accountWasCreated: true,
          referredVendorUserId: detail.ownerUserId,
          newUserId: input.user.id,
        })
      )
        return "self_referral_blocked";
    }
    const { data, error } = await createServerAdminClient().rpc(
      "vendor_referral_credit_v1",
      {
        p_referred_user_id: input.user.id,
        p_store_id: context.version === 2 ? context.storeId : null,
        p_gvvi_id: context.version === 1 ? context.gvviId : null,
        p_created_at: context.createdAt,
        p_expires_at: context.expiresAt,
      },
    );
    if (error) return "credit_failed";
    if (data === "credited") {
      await trackServerEvent({
        eventName: "vendor_referred_signup",
        userId: input.user.id,
        metadata: {
          contract_version: "VENDOR_STOREFRONTS_V1",
          source: context.version === 2 ? "store" : "gvvi",
        },
      });
    }
    if (data === "credited" || data === "already_credited") return "credited";
    if (
      [
        "invalid_context",
        "not_new_account",
        "vendor_offer_unavailable",
        "self_referral_blocked",
      ].includes(data)
    )
      return data;
    return "credit_failed";
  } catch {
    // Attribution must never prevent authentication or a customer's destination.
    return "credit_failed";
  }
}
