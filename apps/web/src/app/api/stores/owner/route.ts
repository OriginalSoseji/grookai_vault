import { NextRequest, NextResponse } from "next/server";
import { createServerComponentClient } from "@/lib/supabase/server";
import { readStorefront, STORE_NO_STORE } from "@/lib/stores/storefrontServer";
import { storeFilters, type StoreOwner } from "@/lib/stores/storefrontTypes";
import { getSiteOrigin } from "@/lib/getSiteOrigin";
import { isOwnedVaultInstanceMediaPath } from "@/lib/vaultInstanceMedia";
import { savePublicProfileSettings } from "@/app/account/actions";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const client = await createServerComponentClient();
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user)
      return new NextResponse("Sign in required", {
        status: 401,
        headers: STORE_NO_STORE,
      });
    const { data, error } = await client.rpc("vendor_store_owner_v1");
    if (error) throw error;
    const owner = data as StoreOwner;
    const inventory = owner.store
      ? await readStorefront(
          owner.store.slug,
          "manage",
          {
            ...storeFilters(request.nextUrl.searchParams),
            kind:
              request.nextUrl.searchParams.get("kind") === "all" ||
              !request.nextUrl.searchParams.get("kind")
                ? "catalog"
                : request.nextUrl.searchParams.get("kind")!,
          },
          client,
        )
      : null;
    if (inventory) {
      const ids = inventory.items.filter(item => item.entry_type === "catalog_copy").map(item => item.id);
      if (ids.length) {
        const photos = await client.from("vault_item_instances").select("id,image_url,image_source,image_display_mode")
          .eq("user_id", user.id).is("archived_at", null).in("id", ids);
        if (photos.error) throw photos.error;
        const version = Date.now();
        for (const item of inventory.items) {
          if (item.entry_type !== "catalog_copy") continue;
          const photo = photos.data.find(row => row.id === item.id);
          item.catalog_image_url = item.display_image_url;
          item.has_user_photo = Boolean(photo?.image_display_mode === "uploaded" && photo.image_source === "user_photo" && isOwnedVaultInstanceMediaPath(user.id, item.id, "front", photo.image_url));
          if (item.has_user_photo) {
            item.display_image_url = `/api/stores/owner/copy-photo?id=${encodeURIComponent(item.id)}&v=${version}`;
            item.display_image_kind = "user_photo";
          }
        }
      }
    }
    const profile = await client.from("public_profiles").select("slug,display_name,public_profile_enabled,vault_sharing_enabled").eq("user_id", user.id).maybeSingle();
    if (profile.error) throw profile.error;
    return NextResponse.json(
      { ...owner, inventory, profile: profile.data, preorders_enabled: process.env.GROOKAI_PREORDER_DRAFTS_ENABLED === "true" },
      { headers: STORE_NO_STORE },
    );
  } catch {
    return new NextResponse("Store could not be loaded", {
      status: 503,
      headers: STORE_NO_STORE,
    });
  }
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (
    (origin && origin !== getSiteOrigin()) ||
    (!origin &&
      !/^Bearer \S+$/i.test(request.headers.get("authorization") ?? ""))
  ) {
    return new NextResponse("Invalid request origin", {
      status: 403,
      headers: STORE_NO_STORE,
    });
  }
  try {
    const client = await createServerComponentClient();
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user)
      return new NextResponse("Sign in required", {
        status: 401,
        headers: STORE_NO_STORE,
      });
    const body = (await request.json()) as Record<string, unknown>;
    let rpc: string;
    let params: Record<string, unknown>;
    switch (body.action) {
      case "visibility": {
        if (typeof body.slug !== "string" || typeof body.display_name !== "string" || typeof body.public_profile_enabled !== "boolean" || typeof body.vault_sharing_enabled !== "boolean") throw new Error("Invalid visibility settings");
        const authority = await client.rpc("vendor_store_owner_v1");
        const owner = authority.data as StoreOwner | null;
        if (authority.error || !owner?.capabilities.store_app || !owner.rollout.app_enabled) return NextResponse.json({ error: "Store access unavailable" }, { status: 403, headers: STORE_NO_STORE });
        const current = await client.from("public_profiles").select("avatar_path,banner_path").eq("user_id", user.id).maybeSingle();
        if (current.error) throw current.error;
        const saved = await savePublicProfileSettings({ slug: body.slug, displayName: body.display_name, publicProfileEnabled: body.public_profile_enabled, vaultSharingEnabled: body.vault_sharing_enabled, avatarPath: current.data?.avatar_path ?? null, bannerPath: current.data?.banner_path ?? null });
        if (!saved.ok) return NextResponse.json({ error: Object.values(saved.fieldErrors).filter(Boolean).join(" ") || saved.message || "Visibility could not be saved" }, { status: 400, headers: STORE_NO_STORE });
        return NextResponse.json({ ok: true }, { headers: STORE_NO_STORE });
      }
      case "save":
        if (
          typeof body.slug !== "string" ||
          typeof body.display_name !== "string" ||
          typeof body.description !== "string"
        )
          throw new Error("Invalid store details");
        rpc = "vendor_store_save_v1";
        params = {
          p_slug: body.slug,
          p_display_name: body.display_name,
          p_description: body.description,
        };
        break;
      case "item":
        if (
          typeof body.instance_id !== "string" ||
          typeof body.selected !== "boolean"
        )
          throw new Error("Invalid selection");
        rpc = "vendor_store_select_item_v1";
        params = { p_instance_id: body.instance_id, p_selected: body.selected };
        break;
      case "section":
        if (
          typeof body.section_id !== "string" ||
          typeof body.selected !== "boolean" ||
          !Number.isInteger(body.position)
        )
          throw new Error("Invalid section");
        rpc = "vendor_store_select_section_v1";
        params = {
          p_section_id: body.section_id,
          p_selected: body.selected,
          p_position: body.position,
        };
        break;
      case "publish":
        if (
          !["app", "web"].includes(String(body.surface)) ||
          typeof body.publish !== "boolean"
        )
          throw new Error("Invalid publication");
        rpc = "vendor_store_publish_v1";
        params = { p_surface: body.surface, p_publish: body.publish };
        break;
      case "media":
        if (
          !["logo", "banner"].includes(String(body.kind)) ||
          !(typeof body.path === "string" || body.path === null)
        )
          throw new Error("Invalid media");
        rpc = "vendor_store_set_media_v1";
        params = { p_kind: body.kind, p_path: body.path };
        break;
      default:
        throw new Error("Unknown store action");
    }
    const { error } = await client.rpc(rpc, params);
    if (error)
      return NextResponse.json(
        {
          error:
            error.code === "42501"
              ? "Store access unavailable"
              : "Change could not be saved. Check eligibility and store details.",
        },
        { status: error.code === "42501" ? 403 : 400, headers: STORE_NO_STORE },
      );
    return NextResponse.json({ ok: true }, { headers: STORE_NO_STORE });
  } catch {
    return new NextResponse("Invalid store request", {
      status: 400,
      headers: STORE_NO_STORE,
    });
  }
}
