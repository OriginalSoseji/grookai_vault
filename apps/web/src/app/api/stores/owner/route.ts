import { NextRequest, NextResponse } from "next/server";
import { createServerComponentClient } from "@/lib/supabase/server";
import { readStorefront, STORE_NO_STORE } from "@/lib/stores/storefrontServer";
import { storeFilters, type StoreOwner } from "@/lib/stores/storefrontTypes";
import { getSiteOrigin } from "@/lib/getSiteOrigin";
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
    return NextResponse.json(
      { ...owner, inventory },
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
