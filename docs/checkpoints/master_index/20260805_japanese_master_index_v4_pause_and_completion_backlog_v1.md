# Japanese Master Index V4 Pause And Completion Backlog V1

Date: 2026-08-05

## Purpose

This checkpoint pauses Japanese Master Index V4 after the completed parent
identity apply and the first exact self-hosted image integration. It separates
what is already complete from optional Japanese productization work that may be
resumed later.

This work is not required for the current launch. The completed Japanese V4
state is stable and useful as canonical parent identity infrastructure, while
the remaining work concerns broader Japanese image coverage, family review,
printing publication, scanner coverage, and downstream product integration.

Checkpoint base:

- Repository: `OriginalSoseji/grookai_vault`
- Main commit containing the completed production proof:
  `3c7c5eff3b4a15aef395c8546771167c85aa9970`
- Completion PRs: `#181` and `#182`
- Checkpoint branch: `docs/jpn-v4-deferred-completion-checkpoint`

## Executive Status

Japanese V4 has two different completion states that must not be conflated:

1. **Parent identity foundation: complete.** The approved V4 sets, parent
   identities, identity evidence, and family-review queue are durable and
   reconciled in production.
2. **Full Japanese productization: intentionally incomplete.** Only 53 parents
   have exact self-hosted images proven through production product surfaces.
   Public child printings, family promotion, scanner indexing, Japanese
   pricing, and vault integration remain outside the completed gate.

There is no open incident and no rollback is required. The correct state is to
leave the existing rows and 53 image pointers unchanged until a new bounded
project is approved.

## Completed Work

### 1. Schema And Migration History

- Migration `20260805100000` is durably applied.
- Local and production migration history were proven contract-equivalent.
- Migration SQL SHA-256:
  `2cd8c70026d74296a469afdb5017944bb37c3a640e064288e4d55d140c037fb6`
- The Japanese apply did not modify or repair unrelated migration history.

### 2. Japanese V4 Parent Identity Apply

The exact founder-approved payload was durably applied and read back:

| Layer | Durable rows |
| --- | ---: |
| Set rows | 1,041 |
| Parent `card_prints` rows | 5,336 |
| `card_print_identity` rows | 5,336 |
| Identity source-evidence rows | 5,461 |
| Family-review queue rows | 5,336 |

Frozen payload authority:

- Writer payload fingerprint:
  `b11c033901f8cb94b641f2c6e7f3586a3db2bc994242f7d8aa28cb2198218e2c`
- Source preflight fingerprint:
  `b269de1cae5bb83113e9b88f27400613fca92508c681950861c62213cd6ec36b`
- English family state was unchanged by the apply.
- No public child printing, image, pricing, vault, cleanup, deletion, or family
  promotion was included.

### 3. Read-Only Product Inventory

The post-apply inventory reconciled all 5,336 parents with zero findings.
At that point it proved:

- 5,336 parent search documents in each governed parent-search lane;
- 12/12 sampled exact GV-ID RPC searches;
- 5,336 external image pointers and zero missing image pointers;
- zero public V4 child printings;
- zero scanner/fingerprint rows for these parents;
- 3,853 pending `resolved_species` family candidates;
- 1,483 pending `resolved_domain` family candidates;
- zero family promotions.

The inventory fingerprint is
`54cdac7d005e1c0a043ad1684715be3dfee31ea8f585f38d5de94fb18c64e4a4`.

### 4. Image Acquisition And Source Remediation Proof

A no-write 70-card acquisition sample proved the image acquisition mechanics.

- 17 original source images met the high-resolution threshold.
- 53 original sample images were low resolution.
- Exact source remediation promoted 36 of those 53 to deterministic
  high-resolution-ready evidence.
- 13 remained review-only.
- 4 remained blocked.

The unresolved 17 sample rows were preserved instead of guessed. They are part
of the broader remaining image backlog.

### 5. Storage And Pointer Proof

- A transient 17-object Storage canary uploaded, read back, removed, and proved
  all objects absent afterward.
- A separately approved permanent package uploaded 53 exact objects with
  collision preflight, `upsert: false`, and byte-exact readback.
- A rollback-only database transaction proved the exact 53-row pointer package.
- A separately approved durable apply changed only `image_note`, `image_path`,
  and `image_status` on those 53 parents.
- External image URLs and representative/source fields were preserved as
  fallbacks.

Pointer package authority:

- Approval fingerprint:
  `e76ecd6f12ad5c1a1a1f6836d54c34d527e4688f43d5196331aed31da93df912`
- Pointer plan hash:
  `0600e0de392dcf714b5a3450a6f05fd739e6b32092e9e46883c747c56bacf5be`
- Mutation contract hash:
  `5f103aaabda1f04533426e6695b367460c29483e694b5909e233c6529778e6f9`

### 6. Product Integration And Production Proof

The product readers were repaired to handle case-equivalent Japanese set-code
lanes without mutating canonical data. The final deployed proof passed:

- 53/53 complete parent-row hashes;
- 53/53 exact self-hosted image bytes;
- 53/53 exact search matches;
- 53/53 card-detail routes;
- 53/53 hosted-first set-grid rows;
- 53/53 preserved external fallbacks;
- 27/27 set pages;
- 27/27 exact set totals and preferred metadata;
- 163 distinct production HTTP checks;
- zero retries in the final proof;
- zero database writes and zero Storage writes during product smoke.

Final production proof:

- JSON SHA-256:
  `4dc8ed1f2024f62e46c43dccae8e0dced16d793c59a94f23774e8fb1b6d0bf74`
- Markdown SHA-256:
  `f24dc5c14e78a47cd611a6bda4f3d55af2011eb4616278e470806ca608c3c9d8`
- Content fingerprint:
  `a660c8e067ee19856f24b34a4ff5df71e0be2b28aa991fdd3c62027664652774`

## Current Production Truth

| Area | Current proven state | Completion status |
| --- | --- | --- |
| Japanese V4 parent identity | 5,336 parents and evidence rows are durable and reconciled | Complete |
| Set identity | 1,041 approved set rows are durable | Complete for V4 payload |
| Parent search documents | All 5,336 existed in governed parent-search lanes at inventory time | Foundation complete |
| Exact self-hosted parent images | 53 parents are hosted, pointed, and product-proven | Bounded slice complete |
| Remaining parent images | 5,283 are outside the completed self-hosting package | Deferred |
| External image evidence | All 5,336 had an external pointer at inventory time; the 53 hosted rows preserve fallback URLs | Evidence only |
| Family review | 3,853 species and 1,483 domain candidates remain pending | Deferred |
| Family promotion | Zero V4 rows promoted | Not started |
| Public child printings | Zero V4 public children were authorized or created | Not started |
| Printing-level finish truth | Not established by the parent payload | Not started |
| Scanner index | Zero V4 parent fingerprints at inventory time | Not started |
| Japanese pricing | No V4 pricing writes or publication | Not started |
| Japanese vault integration | No V4 vault writes or publication | Not started |

The 5,283 remaining-image count consists of the 17 unresolved rows from the
70-card canary plus 5,266 parents that were not part of that acquisition
sample. Before resuming, a fresh read-only inventory must confirm the live
counts because this checkpoint intentionally does not perform another
production read.

## Why This Does Not Block Launch

- The frozen Production V1 pricing scope is English Pokemon exact printings.
- Japanese V4 parent identities are additive canonical infrastructure.
- No launch surface needs to pretend that unresolved Japanese parent rows are
  public exact printings.
- The completed 53-image slice is already safe and deployed.
- Deferring broader Japanese image, family, scanner, pricing, and vault work
  does not degrade English catalog or pricing correctness.

Launch should remain blocked from unsupported Japanese behavior, not from the
existence of this backlog. Specifically, clients must not manufacture Japanese
finish, variant, pricing, or public-printing truth from parent rows.

## Remaining Work To Fully Productize Japanese V4

### Lane A: Refresh The Read-Only Inventory

This is the mandatory first step after the pause.

1. Branch from the then-current `main`; do not resume from an old execution
   branch.
2. Re-run a read-only production inventory for all 5,336 frozen parent IDs.
3. Reconcile row existence, identity hashes, image fields, family-review state,
   child-printing state, search state, and scanner state.
4. Record any legitimate changes made by other governed projects.
5. Stop on missing parents, changed identity authority, unexpected public
   children, or incompatible schema drift.

No prior fingerprint is authority for a new write after this refresh.

### Lane B: Complete Parent Image Coverage

The remaining image project is 5,283 parents, not a continuation of the old
53-row approval.

For each bounded batch:

1. Freeze exact parent UUIDs/GV-IDs and current complete-row snapshots.
2. Resolve images only with independent exact identity evidence: Japanese
   printed name, set identity, collector number, and source assertion.
3. Record source URL, authority, licensing/provenance, MIME type, dimensions,
   byte size, SHA-256, acquisition result, and abstention reason.
4. Separate exact, review-only, blocked, unavailable, low-resolution,
   ambiguous, and invalid files. Never lower the evidence threshold to reach a
   coverage target.
5. Content-hash duplicates may share stored bytes only when the exact artwork
   relationship is proven. Duplicate bytes must not merge canonical identities.
6. Prove local download and image validation before Storage access.
7. Prepare a collision-free Storage plan with deterministic paths,
   `upsert: false`, exact readback, and rollback limited to objects created by
   that execution.
8. Obtain separate approval for the Storage mutation.
9. Prepare complete-row compare-and-swap pointer changes only for verified
   objects; preserve external fallbacks.
10. Prove pointer rollback in one transaction, obtain separate apply approval,
    apply, read back, and run hosted-first product smoke.

Completion does not require inventing an image for every row. Every parent
must instead reach an explicit disposition: exact self-hosted image or a
preserved, explainable coverage gap.

Recommended restart batch: up to 250 recent or high-product-value parents,
with no Storage or database access in the first acquisition/readiness gate.

### Lane C: Resolve Family Review

This lane can proceed in parallel with image acquisition because image hosting
does not grant family authority.

1. Reconcile the 3,853 species candidates and 1,483 domain-only candidates.
2. Define deterministic cross-language family authority and collision rules.
3. Approve only rows with exact source-backed family evidence.
4. Give every row a final disposition: approved, rejected, blocked, or still
   requiring a named source.
5. Publish reviewed decisions through an immutable release with rollback and
   exact readback.

Do not bulk-promote `resolved_species`, and do not infer species identity from
English translation or artwork resemblance alone.

### Lane D: Establish Exact Child Printings

Parent identity is artwork-level truth and does not prove a physical printing.

1. Acquire printing-level evidence for finish, edition, stamp, promo marker,
   and other identity-significant variant attributes.
2. Rebuild candidates from current evidence; do not reuse the deferred
   `normal` proposal as fact.
3. Detect collisions against existing Japanese and cross-language printings.
4. Preserve parent-only rows when finish evidence is insufficient.
5. Use rollback-only transaction proof, explicit approval, durable readback,
   and product-surface verification for each bounded release.

Shared artwork may reuse an artwork image, but variant-specific stamps, text,
borders, color differences, or print markers require variant-specific evidence.

### Lane E: Build Scanner Coverage

1. Seed only exact self-hosted, identity-confirmed parent or printing images.
2. Generate fingerprints offline and version the index inputs and algorithm.
3. Measure duplicate-artwork collisions and false-positive behavior.
4. Publish through a separate atomic scanner-index release.
5. Preserve canonical search fallback when scanner evidence is missing.

The existing 53 exact images are a valid future scanner canary, but the image
pointer apply did not authorize scanner publication.

### Lane F: Complete Product Surfaces

After the underlying lane is authorized, verify signed-in web and Flutter
behavior for:

- Japanese printed names and collector numbers;
- English collector-facing aliases where source-backed;
- GV-ID and set-code exact search;
- case-equivalent legacy set-code reads;
- card detail and set grids;
- hosted-first images with preserved fallback behavior;
- explicit parent-only or unavailable-printing states;
- scanner results when an index release exists.

Parent search reachability must never be presented as proof that an exact
physical printing is publicly available.

### Lane G: Pricing And Vault Integration

This is last, not parallel with unresolved printing identity.

1. Publish Japanese pricing only for exact canonical child printings with exact
   language and finish mappings.
2. Quarantine ambiguous marketplace mappings.
3. Allow vault additions only against supported public printing identities.
4. Preserve provenance from source row through publication and UI.

No parent-level placeholder price or inferred finish is permitted.

## Dependency Order

```text
Durable parent identities (complete)
  |-- Parent image acquisition -> Storage -> pointers -> product smoke
  |                                      `-> scanner canary/release
  |-- Family review -> immutable family release
  `-- Printing-level evidence -> child-printing release -> pricing/vault
```

Image acquisition and family review can run independently. Scanner work waits
for exact hosted images. Pricing and vault work wait for exact public child
printings. None of these lanes may infer authority from another lane.

## Definition Of Done For The Deferred Program

Japanese V4 full productization is complete only when:

- all 5,336 frozen parents reconcile or have an explicitly governed successor;
- every parent image has an exact hosted result or explicit coverage-gap
  disposition;
- every family-review row has a final governed disposition;
- every published child printing has exact printing-level evidence;
- unsupported child candidates remain absent rather than defaulting to
  `normal`;
- eligible exact hosted images are represented in a versioned scanner index;
- signed-in web and Flutter surfaces pass search, image, set, and detail smoke;
- any Japanese price or vault row targets an exact public printing;
- all releases have immutable inputs, hashes, rollback boundaries, durable
  readback, and current checkpoints.

This definition permits honest coverage gaps. It does not permit unsupported
facts in order to report 100 percent coverage.

## What Must Never Be Broken

- Do not rewrite or delete the 5,336 applied parent identities for convenience.
- Do not change V1 deterministic IDs.
- Do not convert parent evidence into finish or child-printing truth.
- Do not auto-promote the 5,336 family-review rows.
- Do not copy one variant's stamp, text, border, error, or finish evidence to
  another variant.
- Do not label external URLs as self-hosted coverage.
- Do not overwrite existing Storage objects.
- Do not remove external image fallbacks without a separately proven policy.
- Do not normalize mixed-case Japanese set codes through an unrelated data
  mutation; readers currently support the legacy lanes.
- Do not mutate English, non-Japanese, pricing, vault, or user-owned data from a
  Japanese catalog batch.
- Do not reuse the approvals or fingerprints in this checkpoint for a future
  mutation. Every future write requires a fresh package and explicit scope.

## Restart Checklist

When this project resumes:

1. Read this checkpoint and the five completion checkpoints listed below.
2. Start from current `main` and confirm a clean tracked worktree.
3. Run a fresh read-only inventory and compare it with the frozen V4 scope.
4. Choose exactly one bounded lane and batch; do not reopen all downstream
   work at once.
5. Generate new immutable artifacts, complete-row snapshots, hashes, tests,
   and stop conditions.
6. Run rollback-only proof before any database write.
7. Request explicit approval for the exact mutation package.
8. Apply once, read back, smoke-test, checkpoint, and stop.

Primary implementation directory:
`scripts/audits/japanese_master_index_v4/`

Primary evidence directory:
`docs/audits/japanese_master_index_v4/`

Required prior checkpoints:

- `20260805_japanese_master_index_v4_database_apply_completion_v1.md`
- `20260805_japanese_master_index_v4_product_integration_inventory_v1.md`
- `20260805_japanese_master_index_v4_permanent_storage_upload_completion_v1.md`
- `20260805_japanese_master_index_v4_image_pointer_apply_completion_v1.md`
- `20260805_japanese_master_index_v4_image_pointer_product_smoke_completion_v1.md`

## Explicit Next Gate

No immediate gate is required. The project is paused as non-launch-critical.

When resumed, the exact next safe gate is a **fresh read-only Japanese V4
integration inventory**, followed by a **no-write image acquisition/readiness
package for no more than 250 explicitly selected remaining parents**. Stop
before Storage access, database writes, family promotion, child-printing
publication, scanner publication, pricing, or vault integration.

## Stop State

The Japanese V4 parent identity foundation and the first 53-image production
slice are complete, deployed, and proven. The remaining program is documented,
deferred, and not a launch blocker. No write, upload, promotion, publication,
or cleanup is authorized by this checkpoint.
