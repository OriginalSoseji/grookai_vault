import "server-only";
import { NextResponse } from "next/server";
import { createServerAdminClient } from "@/lib/supabase/admin";
import { createServerComponentClient } from "@/lib/supabase/server";
import { readStorefront, STORE_NO_STORE } from "./storefrontServer";

// The route selects the audience. Query strings never elevate media access.
export async function storeMediaResponse(
  slug: string,
  kind: string,
  surface: "web" | "app" | "preview",
) {
  const hidden = () =>
    new NextResponse("Not found", { status: 404, headers: STORE_NO_STORE });
  try {
    if (kind !== "logo" && kind !== "banner") return hidden();
    const client =
      surface === "web" ? undefined : await createServerComponentClient();
    if (client && !(await client.auth.getUser()).data.user) return hidden();
    const store = await readStorefront(slug, surface, {}, client);
    if (!store) return hidden();
    const admin = createServerAdminClient();
    const { data: row } = await admin
      .from("vendor_stores")
      .select("logo_path,banner_path")
      .eq("id", store.store.id)
      .single();
    const path = kind === "logo" ? row?.logo_path : row?.banner_path;
    if (
      typeof path !== "string" ||
      !path.startsWith(`${store.store.id}/${kind}/`)
    )
      return hidden();
    const { data, error } = await admin.storage
      .from("vendor-store-media")
      .download(path);
    if (error || !data) return hidden();
    return new NextResponse(await data.arrayBuffer(), {
      headers: {
        ...STORE_NO_STORE,
        "content-type": data.type,
        "content-security-policy": "default-src 'none'",
      },
    });
  } catch {
    return hidden();
  }
}
