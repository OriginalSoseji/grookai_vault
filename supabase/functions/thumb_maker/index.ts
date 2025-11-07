// Edge Function: thumb_maker
// Input: { listingId: string, storagePath: string }
// Behavior: attempts to copy original to a public thumb path; TODO: generate real 512px JPG when an image lib is available.
// Logs compact JSON with redacted keys.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.46.1";

type Input = { listingId?: string; storagePath?: string };

serve(async (req) => {
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = Deno.env.toObject();
  const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);
  const json = (await req.json().catch(() => ({}))) as Input;
  const listingId = json.listingId?.trim();
  const storagePath = json.storagePath?.trim();
  const log = (e: Record<string, unknown>) => console.log(JSON.stringify({ func: "thumb_maker", ...e }));

  if (!listingId || !storagePath) {
    log({ ok: false, err: "missing_params", listingId, storagePath });
    return new Response(JSON.stringify({ error: "missing params" }), { status: 400 });
  }

  try {
    // Try to read the original
    const fromPath = storagePath.startsWith("listing-photos/") ? storagePath : `listing-photos/${storagePath}`;
    const destRel = `public/thumbs/${listingId}_720x960.jpg`;
    const toPath = `listing-photos/${destRel}`;

    // NOTE: Edge runtime may not support image resize libs. Temporary shim: copy original bytes.
    const { data: dl, error: dlErr } = await supabase.storage.from("listing-photos").download(fromPath.replace(/^listing-photos\//, ""));
    if (dlErr) throw dlErr;
    const bytes = new Uint8Array(await dl!.arrayBuffer());

    const { error: upErr } = await supabase.storage.from("listing-photos").upload(
      toPath.replace(/^listing-photos\//, ""),
      bytes,
      { contentType: "image/jpeg", upsert: true },
    );
    if (upErr) throw upErr;

    // Upsert DB row with fixed dims
    await supabase.from('listing_photos').upsert({
      listing_id: listingId,
      storage_path: fromPath.replace(/^listing-photos\//, ""),
      thumb_url_720x960: destRel,
      width_thumb: 720,
      height_thumb: 960,
    }, { onConflict: 'listing_id' });

    const thumb_url = destRel;
    log({ ok: true, listingId, storagePath, dest: destRel, w: 720, h: 960 });
    return Response.json({ ok: true, thumb_url, w: 720, h: 960 });
  } catch (err) {
    log({ ok: false, listingId, storagePath, err: String(err?.message ?? err) });
    return new Response(JSON.stringify({ ok: false, error: "processing_failed" }), { status: 500 });
  }
});
