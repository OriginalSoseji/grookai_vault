# Collectible Wave 1 Alternative Artwork Row Addressability V1

## Objective

Replace the aggregate-only count of 124 Yu-Gi-Oh multi-image source cards with
source-ID-addressable metadata evidence. This gate does not assign an artwork
to a set printing and grants no canonical, image, or write authority.

## Frozen Source

- Source: YGOPRODeck API v7 `cardinfo.php`
- Source response SHA-256:
  `883c6da2281e2594608c04b21280ae10bd94d0f5d642269760f698314b337a97`
- Source card count: `14,521`
- Printing candidate count: `44,443`
- Multi-image source card count: `124`

The refinement must fail closed if the response hash or multi-image source-card
count changes. A changed response requires a new independently reviewed gate.

## Evidence Row

Each row records:

- a deterministic evidence ID;
- source card ID;
- exact source response hash;
- distinct source-owned image IDs, never image URLs;
- all printing candidate IDs emitted for that source card;
- explicit unresolved artwork-to-printing mapping status;
- false canonical, write, image-content, and republication authority.

Source image IDs make the source cards and their candidate scope addressable.
They do not prove which image belongs to which set code, rarity, printing, or
canonical row.

## Boundaries

- no database or Storage access;
- no image download, inspection, self-hosting, or URL persistence;
- no AI or vision call;
- no canonical, pricing, publication, or Vault write;
- no source card text or price persistence;
- no artwork-to-printing guess;
- no unattended schedule.

## Required Artifact

`alternative_artwork_index.jsonl` must contain exactly 124 unique source-card
evidence rows. Every printing candidate reference must resolve to the candidate
index emitted from the same byte-identical response. Artifact byte counts and
SHA-256 values must reconcile exactly.

## Stop Condition

Stop after one immutable default-branch metadata-only run, independent artifact
reconciliation, and a permanent checkpoint. Do not apply game foundations or
write card, set, printing, mapping, image, pricing, publication, or Vault rows.
