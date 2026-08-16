# MTG Self-Hosted Image Readiness V1

## Status

Active offline planning contract.

## Purpose

Prepare exact English paper MTG print images for later self-hosting without accessing the database,
Supabase Storage, release controls, pricing, or the network. The frozen catalog manifest and its
verified per-set payloads are the only inputs.

## Identity Contract

Every image plan row must retain:

- canonical `card_print_id`
- canonical `gv_id`
- exact Scryfall print ID
- set code and collector number
- zero-based face index
- explicit `front`, `back`, or `additional_N` face role
- all available Scryfall source qualities
- the selected trusted source URL
- a deterministic proposed self-hosted path

A Scryfall print ID is a print identity, not an artwork deduplication key. Distinct Scryfall print
IDs must retain distinct proposed paths even when their images appear similar.

## Source Trust

V1 trusts only HTTPS image URLs from `cards.scryfall.io` whose quality, face lane, filename,
extension, and embedded Scryfall print ID agree with the frozen payload. Missing, malformed,
untrusted, or identity-inconsistent URLs are explicit findings.

The preferred source order is:

1. PNG
2. large JPEG
3. normal JPEG

Selection is only a plan. This gate performs no download.

## Path Contract

The proposed bucket is `user-card-images`. This matches `CANON_IMAGE_RESOLUTION_CONTRACT_V1` and
the existing self-hosted image tooling, including `scripts/ingest/new_set_release_ingest_v1.mjs`
and the `self_hosted_images_*` audit lane, which use `SELF_HOSTED_IMAGES_STORAGE_BUCKET` with
`user-card-images` as the canonical default. The offline planner records the canonical bucket
literally so its output cannot drift with a local environment variable.

Proposed paths use:

```text
warehouse-derived/self-hosted-images-v1/card_prints/mtg/
  {set_code}/{scryfall_print_id}/{face_role}/{source_url_hash_24}.{ext}
```

The source URL hash makes the proposal replayable and prevents silent source-version replacement.
Final object writes remain subject to collision preflight, download inspection, content hashing,
and exact readback in a separate gate.

## Source Format And Quality Economics

V1 preserves the current source preference order of PNG, large JPEG, then normal JPEG. This order
is not a claim that PNG is the correct permanent acquisition format.

Before a permanent acquisition plan, a bounded download canary must compare PNG and large JPEG for:

- downloaded bytes and projected catalog Storage
- dimensions and image detail
- visual quality at app rendering sizes
- decode/render behavior on supported clients
- projected egress and processing cost

The source order must not change until that evidence exists. The permanent plan may choose a source
or derived format only after the bounded canary documents the quality and cost tradeoff.

## Face Contract

- Face index `0` is `front`.
- Face index `1` is `back`.
- Any future index greater than `1` is `additional_N`.
- Each face receives an independent plan row and target path.
- A missing face or source URL is a gap, never a reason to reuse another face.

## Dedupe Contract

No deduplication is permitted in this readiness gate.

- No URL-based dedupe.
- No filename-based dedupe.
- No artwork-similarity dedupe.
- No cross-print path sharing.

Content-hash equivalence may be measured only after source bytes are downloaded and verified.
Even then, shared physical storage must not erase the independent print and face assertions.

## Outputs

The planner emits:

- aggregate JSON summary
- gzip-compressed JSONL face plan
- JSONL coverage by set
- JSONL gaps
- JSONL URL/identity issues
- JSONL path collisions
- JSONL payload hash inventory
- Markdown report
- SHA-256 artifact manifest

The gzip file is JSONL content compressed with deterministic gzip settings. Its manifest records
both the logical JSONL SHA-256 and compressed-file SHA-256.

## Boundaries

The planner must not:

- import a database or Supabase client
- access the database
- access or mutate Storage
- perform network requests
- update canonical image pointers
- alter pricing or publication
- alter release controls
- mutate the active ingestion worktree

## Next Gate

A later bounded acquisition canary may download a frozen subset, inspect image dimensions and
format, compare PNG against large JPEG economics, compute content hashes, preflight object
collisions, upload without overwrite, read back exact bytes, and produce a separate pointer plan.
None of those actions are authorized here.
