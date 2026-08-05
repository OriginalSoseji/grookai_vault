# Japanese Master Index V4 Image Acquisition Readiness V1

Date: 2026-08-05

## Context

The Japanese V4 production apply created 5,336 parent card identities. The
subsequent product-integration inventory proved that every parent was search
reachable and carried an external image pointer, but none had a self-hosted
image. This gate tested whether those exact preserved pointers can support a
governed image-acquisition pipeline without touching the database or Supabase
Storage.

Work ran on branch `catalog/jpn-v4-production-integration-v2`, starting from
commit `93c2f5809f3fa6db35a97411346d17aa939878cb`.

## Problem

An external image URL is acquisition evidence, not a production image. Before
any Storage upload or database image-pointer change, the project needed an
exact-scope manifest and a bounded download canary that proved source
availability, file type, dimensions, hashes, fallback behavior, deterministic
target paths, and local readback.

## Risk

- A reachable URL may return HTML, a missing response, or invalid bytes.
- A valid image may be too small for production card rendering or scanner use.
- A fallback may preserve availability while reducing image quality.
- Download success does not prove that the image depicts the intended card.
- Uploading before source-quality review would turn an acquisition finding
  into an unsupported production decision.
- Updating database pointers before Storage readback would create broken
  product images.

## Decision

Create `JPN-MASTER-INDEX-V4-IMAGE-ACQUISITION-READINESS-V1` from the verified
local Japanese V4 integration inventory and writer payload. Preserve one
manifest row per applied parent, then fetch a deterministic 70-row canary into
an ignored local cache only.

The canary includes every minority-host primary source and 17 evenly spaced
official-source rows:

- TCGdex primary: 18
- Limitless primary: 35
- Pokemon Card official primary: 17

Each source attempt retains HTTP status, final URL and host, content type,
dimensions, format, byte size, SHA-256, diagnostics, and TLS verification
state. Accepted bytes are hashed again after local-cache readback.

## Current Truths

### Exact Manifest

- Manifest rows: 5,336
- Unique parent IDs: 5,336
- Unique parent GV-IDs: 5,336
- Unique primary URLs: 5,336
- Identity domain: `pokemon_jpn` for all rows
- Visual identity reconfirmations performed: 0
- Self-hosted paths created: 0

Primary sources:

- `www.pokemon-card.com`: 5,283
- `limitlesstcg.nyc3.cdn.digitaloceanspaces.com`: 35
- `assets.tcgdex.net`: 18

Preserved fallback coverage:

- 18 TCGdex rows have Limitless fallbacks.
- 32 Limitless rows have Serebii fallbacks.
- Total rows with a fallback: 50.

### Local Download Canary

- Selected rows: 70
- Valid local downloads: 70
- Quarantined rows: 0
- Primary sources selected: 52
- Fallback sources selected: 18
- HTTP 200 attempts: 70
- HTTP 404 attempts: 18
- Duplicate-content groups: 0
- Local cache bytes: 7,255,413

All 18 TCGdex primary URLs returned HTTP 404 with non-image content. Their
preserved Limitless fallbacks returned valid PNG images, so no selected row
was lost.

Quality disposition:

- Ready for a future bounded Storage canary: 17
- Low-resolution review: 53
- High-resolution JPEG: 17
- Low-resolution PNG: 53

The 53 low-resolution images are 136 x 189 pixels. They prove availability,
but they are not approved as production-quality images. The high-resolution
sample came from the official Pokemon Card source. The low-resolution sample
came from Limitless, including all 18 fallback recoveries.

### Execution Boundary

- Database connections: 0
- Database reads: 0
- Database writes: 0
- Supabase Storage reads: 0
- Supabase Storage writes: 0
- Image-pointer writes: 0
- Child-printing writes: 0
- Family promotions: 0
- Scanner writes: 0
- Source HTTPS fetches: 88
- Local cache files: 70

The cache lives under
`.tmp/jpn_master_index_v4_image_acquisition_canary_v1`, is ignored by Git,
and is not a permanent product artifact.

## Evidence And Fingerprints

- Writer payload fingerprint:
  `b11c033901f8cb94b641f2c6e7f3586a3db2bc994242f7d8aa28cb2198218e2c`
- Integration inventory fingerprint:
  `54cdac7d005e1c0a043ad1684715be3dfee31ea8f585f38d5de94fb18c64e4a4`
- Integration row dataset fingerprint:
  `eeb38caaa7365e9fc75ae8c1f873fed5a4e2e64ca12048d56498d592fca97c61`
- Acquisition artifact content fingerprint:
  `0cd2ef5619f4e90247aa5222ee5ca0d5645ddd005f5060a6bdae8c8fec5aaaa8`
- Manifest dataset fingerprint:
  `4779c6e1324d5006611acc6748500e8cb4d6b046d834388ad29a299ed80169f6`
- Canary selection fingerprint:
  `8a0d758f25b748fb5cfea4779cc05d1899146601c1897c831957efb2198e0a7d`
- Canary dataset fingerprint:
  `6af858827d4d63e6f9c8f8dbccdc002ffe36c3008b70b2168b1fa009246618af`

## Artifact Hashes

- `jpn_image_acquisition_readiness_v1.json`:
  `ca3a1956463e4f7e0fcd0d3ef1e008570171d96d5c697c59e2731df67041c791`
- `jpn_image_acquisition_readiness_v1.md`:
  `4249c4de2b23fe3cf5ea779ed7b2d980e3e4b3c404b9d556cd825d5168a6e815`
- Manifest row shard 1:
  `ab661c3092ae51cc7d938bd8fc81d577c8d24d64eecd0e10b1920c5bf58b9d25`
- Manifest row shard 2:
  `34100024b902cb3168f0349d7632bb6e380256aee5b6322dd99dc7ddab71ea82`
- Canary row shard:
  `1a6b509e3ac78b64894665bce54700c33aa1670c51dc7142cf0e2d62512e001e`

## Verification

- Script syntax check passed.
- `package.json` parsing passed.
- Focused image-readiness contracts: 9/9 passed.
- Full Japanese Master Index contracts: 145/145 passed after artifact
  freezing.
- All row-shard content fingerprints verified.
- `git diff --check` passed before checkpoint creation and is rerun before
  commit.
- TLS verification remained enabled using Node bundled roots plus Windows
  system CA roots.

## Invariants

- Downloaded bytes are not a self-hosted image until an authorized Storage
  upload succeeds and is read back.
- A valid image is not automatically a production-quality image.
- Download success does not constitute visual identity confirmation.
- Low-resolution fallback images must not be silently promoted to high-quality
  production assets.
- External source URLs remain evidence pointers, not app runtime dependencies.
- Database image pointers must not change before bounded Storage upload and
  readback evidence exists.
- Image evidence must not create child finish, public visibility, family,
  scanner, pricing, vault, English, or non-Japanese claims.

## Explicit Next Gate

Prepare two no-database-write packages:

1. A source-remediation inventory for the 53 low-resolution rows, preferring
   exact official or otherwise higher-resolution evidence and preserving the
   current valid files only as fallback evidence.
2. A separately approved, bounded Supabase Storage upload/readback canary for
   the 17 high-resolution rows, with deterministic object paths, content-hash
   verification, rollback instructions, and no database pointer updates.

Stop after Storage readback and rollback proof. Database `image_path` updates
remain a later, independently approved gate.

## Stop State

The exact 5,336-row acquisition manifest and 70-row local download canary are
complete. Acquisition mechanics and fallback recovery are proven. No database
or Storage access occurred. Seventeen rows are candidates for a bounded
Storage canary; 53 rows remain in low-resolution review.
