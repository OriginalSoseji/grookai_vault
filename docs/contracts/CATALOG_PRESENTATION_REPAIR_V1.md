# Catalog Presentation Repair V1

Date: 2026-09-12
Producer baseline: 598e17a44aab6dcd836c282cd8d842dc10f2cae1

The founder reported missing set covers, Japanese card images, untranslated set
names, opaque Japanese references, misleading Standard Print labels, and account
gates on One Piece and MTG browsing.

## Boundaries

- Preserve the approved collector design and all canonical UUIDs, GV IDs, links,
  printings, pricing and ownership. Readable references are display metadata,
  never replacement identity keys.
- English display names and Japanese printed names remain separate. Reuse exact
  preserved source assertions; ambiguous translations stay in the gap report.
- Reuse an existing governed cover first. An exact-set, self-hosted card may be
  a representative cover, not evidence of a package or an exact finish.
- External image URLs are acquisition candidates, not proof of self-hosting.
  Missing Japanese artwork must not fall back to the English printing.
- Missing printing evidence is `Finish not confirmed`, never a claim of Normal
  or Standard Print. Existing verified Reverse Holo children remain selectable.
- Public catalog activation is limited to MTG and One Piece, preserving hidden
  sets, pricing licensing, authentication for ownership, and all other games.
- Production Storage, pointer and release-control repairs require frozen plans,
  exact collision/preflight checks and readback. No ad-hoc canonical rewrites.

## Verification

Record read-only production coverage and reproducible display-manifest inputs.
Test bilingual labels, collision abstention, exact-set cover selection, stable
IDs, known finish choices, and anonymous catalog versus private pricing access.
Report local implementation separately from any deployed or applied changes.

## Japanese Image Storage Planning

`japanese_card_image_storage_plan_v1.mjs` consumes an intact acquisition plan,
one successful receipt per selected canonical ID, and freshly decoded original
local bytes. It rejects missing/duplicate IDs, source or hash mismatches,
replacement pointers, unsupported formats, and quality-review images. Object
paths include the canonical UUID and content hash in the existing private bucket.

This compiler is local-only: no source downloads, database access, Storage
access, or pointer writes. A prepared plan is not an uploaded or displayed image.
Execution must be frozen separately, verify collisions before upsert=false
uploads, read back exact bytes, and preserve all pre-existing objects. Updating
canonical image pointers requires a separate fresh source-bound compare-and-swap
and readback; these plans do not reuse historical Japanese V4 approvals.
