import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

function read(relativePath) {
  return fs.readFileSync(
    new URL(`../../${relativePath}`, import.meta.url),
    "utf8",
  );
}

test("web card detail reads ordered exact faces and exposes a face selector", () => {
  const loader = read("apps/web/src/lib/getPublicCardByGvId.ts");
  const page = read("apps/web/src/app/card/[gv_id]/page.tsx");
  const gallery = read("apps/web/src/components/cards/CardFaceGallery.tsx");
  assert.match(loader, /get_card_print_image_faces_v1/);
  assert.match(
    loader,
    /sort\(\(left, right\) => left\.face_index - right\.face_index\)/,
  );
  assert.match(page, /resolvedCard\.image_faces\?\.length/);
  assert.match(gallery, /role="tablist"/);
  assert.match(gallery, /aria-selected=\{selected\}/);
  assert.match(gallery, /face\.face_role === "back"/);
});

test("Flutter card detail fails closed when the face RPC is unavailable", () => {
  const screen = read("lib/card_detail_screen.dart");
  assert.match(screen, /get_card_print_image_faces_v1/);
  assert.match(screen, /catch \(_\) \{\s*return const <_CardImageFace>\[\];/);
  assert.match(screen, /SegmentedButton<int>/);
  assert.match(screen, /selectedFace\?\.role == 'back'/);
});
