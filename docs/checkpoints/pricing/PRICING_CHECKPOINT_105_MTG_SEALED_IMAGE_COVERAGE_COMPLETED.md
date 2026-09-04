# Pricing Checkpoint 105: MTG Sealed Image Coverage Completed

## Context

Checkpoint 104 froze self-hosted images, governed pricing refresh, and
signed-in visibility as separate MTG sealed productization gates. Pull request
`#408` then added the zero-write image coverage worker and evidence contract to
`main` as `e616615883cb808ad8c870380d9d52da4a4d80bf`.

GitHub Actions run
[`33841181449`](https://github.com/OriginalSoseji/grookai_vault/actions/runs/33841181449)
executed Gate A from that exact clean producer SHA.

## Problem

The active frozen MTG sealed release contained 2,182 members, but Grookai had
not proven which exact mapped products had usable source package images. It
also lacked a sealed-specific image evidence contract. Uploading images before
that proof could have attached placeholders, invalid responses, or one
variant's package image to another variant.

## Risk

- External URLs could be mistaken for durable client media.
- Shared bytes could be mistaken for shared variant identity.
- Placeholder images could enter a permanent release.
- Missing source images could be interpreted as missing products.
- A successful audit could be mistaken for Storage upload or visibility.
- Large workflow artifacts could be lost after GitHub retention expires.

## Decision

Accept the complete zero-write Gate A coverage result and freeze its eligible
and excluded sets as audit evidence only.

- Release members reconciled: `2,182/2,182`
- Exact image eligible: `2,149`
- Explicitly excluded: `33`
- Unique valid image byte objects: `2,144`
- Exact image ready: `2,133`
- Shared bytes with separate exact variant evidence: `16`
- Invalid images: `30`
- Placeholders: `3`
- Identity conflicts: `0`
- Reconciliation mismatches: `0`

The 30 invalid rows failed exact source retrieval with `403` or `404`. The
three placeholder rows returned valid JPEG bytes with implausibly small
dimensions. They remain coverage gaps, not product or identity failures.

## Alternatives Rejected

- Upload every returned response: rejected because invalid and placeholder
  responses must fail closed.
- Treat identical bytes as one variant assertion: rejected because byte
  deduplication does not transfer identity evidence.
- Hotlink source URLs: rejected because acquisition evidence is not a client
  image contract.
- Drop the 33 exceptions: rejected because absence must remain explicit and
  reviewable.
- Commit only a summary: rejected because member-level evidence must survive
  workflow artifact expiry.

## Permanent Evidence

Permanent evidence is under:

`docs/audits/pricing/mtg_sealed_image_coverage_v1/2026-09-04_live_33841181449/`

The original source-plan and coverage JSONL files are preserved as gzip files.
`permanent_manifest.json` records their compressed hashes, original hashes,
sizes, producer SHA, workflow run, counts, and zero-write boundaries.

Key immutable fingerprints:

- Source plan: `fbe124ed63838a690b700ad2e2659dd22b5060645d8964387476225774d913a0`
- Coverage: `cf0e11f6bd5e990d48fa3b5e9a3f2f58d35a7314c28fe47cbab02f7cf07cdd0d`

## Current Truths

- The durable MTG sealed catalog and frozen price release remain unchanged.
- Gate A source-image coverage is complete for all 2,182 release members.
- Exactly 2,149 members are eligible for a future self-hosted image gate.
- Exactly 33 members remain explicit source-image coverage gaps.
- No image has been uploaded to Grookai Storage by this gate.
- No database image evidence, object, assertion, release, or pointer exists
  because of this gate.
- MTG sealed visibility remains `hidden`.
- The existing signed-in RPC still returns zero MTG sealed rows.

## Invariants

- The frozen Gate A artifacts carry no mutation authority.
- Every future image assertion must remain exact to its sealed variant and
  source mapping.
- Shared bytes may deduplicate Storage objects but not evidence assertions.
- Excluded rows cannot enter an image release without new exact evidence.
- Source URLs never become client-facing image URLs.
- Images, pricing refresh, and visibility remain separate gates.
- One Piece, cards, Vault, and existing pricing releases remain untouched.

## What Must Never Be Broken

- Exact 2,182-member reconciliation.
- The 2,149 eligible / 33 excluded partition for this frozen coverage version.
- Content hash, MIME, dimensions, and source provenance for every eligible row.
- Explicit failure state for invalid and placeholder source images.
- Service-owned, append-only future image evidence.
- Zero anonymous sealed access until separately authorized.

## Explicit Next Gate

Prepare, but do not apply, a sealed-image schema candidate and a transient
Storage canary plan bound to the frozen eligible set. The candidate must define
append-only evidence, content-addressed objects, exact per-variant assertions,
an immutable image release, and a game-scoped pointer with forced RLS and no
anonymous access. No migration apply, Storage upload, image-pointer write,
pricing refresh, deployment, or visibility activation is authorized.
