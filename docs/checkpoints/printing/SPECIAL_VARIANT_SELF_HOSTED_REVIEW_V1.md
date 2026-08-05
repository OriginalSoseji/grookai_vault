# Special Variant Self-Hosted Review V1

## Context

The governed hidden apply created `143` exact-catalog special-variant child printings and `143` active truth-review sidecars. Every row remained `quarantined_candidate` and `hidden_pending_review`. The next unresolved boundary was exact printing imagery and human confirmation.

## Problem

The rows could not be reviewed reliably while images were external, missing, representative, or disconnected from immutable source evidence. An image acquisition pass also could not be allowed to silently approve a row, expose it publicly, or make a TCGplayer mapping authoritative for pricing.

## Risk

An unsafe workflow could hotlink third-party images, assign a mislabeled image to the wrong variant, copy a parent image into a marker-specific child, overwrite canonical parent imagery, approve rows from catalog labels alone, publish hidden rows, or create exact pricing mappings before the printing itself was image-confirmed.

## Decision

All review images are copied into the private Grookai `user-card-images` bucket and served to authenticated reviewers only through a private no-store route. The image bytes, source product, source page, payload hash, dimensions, content type, SHA-256, storage path, and readback are preserved.

The seven transition gates remain separate:

1. exact image discovery;
2. immutable provenance and hash capture;
3. private self-hosted storage and readback;
4. PokeJavi first-pass review with browser-local drafts and exported JSON only;
5. founder confirmation bound to the same packet and image hash;
6. bounded image approval while visibility remains `hidden_pending_review`;
7. independent publication and exact-pricing mapping authorizations.

## Alternatives Rejected

- External hotlinking was rejected because review and future display must not depend on another site remaining available.
- Automatic approval from exact catalog binding was rejected because product binding is not visual confirmation.
- Reusing a mislabeled Salazzle product image was rejected because it omitted the required `STAFF` mark.
- Copying parent images into child printings was rejected because representative artwork does not prove variant markers or finish.
- Combining image approval, publication, and pricing was rejected because each transition has a different authority requirement and blast radius.
- Server-side reviewer draft writes were rejected for this gate. PokeJavi and founder drafts remain browser-local until exported.

## Image Acquisition Result

- selected hidden candidates: `143`
- exact image candidates found: `143`
- primary TCGplayer catalog images: `134`
- product-specific exact fallback sources: `9`
- images uploaded to private Grookai storage: `143`
- exact storage readbacks: `143`
- storage failures: `0`
- database writes: `0`
- approvals: `0`
- public visibility changes: `0`
- pricing mappings: `0`

Eight unavailable catalog images used exact PriceCharting product pages. The Salazzle fallback uses an exact marketplace listing photo where both the Crimson Invasion prerelease mark and the separate `STAFF` mark are visible. Every fallback remains review-flagged and requires human confirmation.

## Review Surface

The signed-in route is `/review/special-variants`.

- PokeJavi keeps the existing Grookai login and is resolved through the existing built-in reviewer entitlement.
- All card images are fetched from `/api/review/special-variants/image/[cardPrintingId]`.
- The image endpoint accepts only rows and storage paths in the frozen manifest.
- Images open into a large evidence view with identity, variant, finish, dimensions, hash, evidence role, and source provenance.
- PokeJavi decisions are saved to browser local storage and exported as `SPECIAL_VARIANT_FIRST_PASS_DECISIONS_V1` JSON.
- A one-page PDF handoff explains login, evidence inspection, decision meanings, local draft storage, and required JSON export without granting database authority.
- Founder confirmation imports that exact PokeJavi artifact and exports `SPECIAL_VARIANT_FOUNDER_DECISIONS_V1` JSON.
- The portal has no POST, PUT, PATCH, DELETE, upload, insert, update, or database path.

## Apply Workflows

The review executor supports three independent gates:

- `image`: writes only child image fields and active truth-review evidence, marks the review `verified`, and keeps visibility `hidden_pending_review`;
- `publication`: changes only the verified review sidecar visibility to `visible`;
- `pricing`: creates an exact active TCGplayer parent mapping only when no conflicting active mapping exists.

All gates:

- default to a transactionally rolled-back dry run;
- are capped at `25` rows;
- use a transaction advisory lock;
- reject duplicate, missing, hash-drifted, or unauthorized rows;
- bind apply to commit SHA, packet fingerprint, founder artifact SHA-256, gate, offset, size, and approval token;
- prove canonical parent rows are unchanged;
- stop on any conflicting TCGplayer mapping;
- never use `on conflict`, overwrite, delete, or inferred repair behavior.

## Current Truths

- The exact review-image corpus is fully self-hosted and hash-verified.
- Founder review completed for all `143` rows. The original artifact confirmed `133`; a separate evidence amendment resolved the remaining `10` without mutating the original decisions.
- The amendment replaced or normalized `9` images and retained one already-exact Flygon image because available higher-resolution candidates showed the wrong Winner variant.
- The image gate applied all `143` rows in seven bounded transactions and independently read back all `143` child/review rows.
- Every child now has `image_source = identity` and `image_status = exact` at its exact private storage path.
- Every review is `verified` and remains `hidden_pending_review`.
- Final storage reconciliation downloaded and hash-verified `143/143` active image objects.
- Public rows, current priced rows, publication authorizations, and pricing authorizations remain `0`.
- Canonical parent rows changed: `0`.
- The `420` authority failures remain untouched.
- Two pre-existing TCGplayer product mappings conflict with the expected parent. They remain evidence, were not overwritten, and block any implicit pricing repair.

## Verification

- focused self-hosted/review contracts: `17/17` passed
- full Node/contract suite: `1366/1366` passed at the repair freeze
- full repository pre-commit shipcheck: passed twice during amendment freeze
- web TypeScript: passed
- web lint: passed with zero warnings
- strict production web build: passed
- private review page unauthenticated smoke: `307` to sign-in
- private image route unauthenticated smoke: `401` with private `no-store`
- `git diff --check`: passed
- storage upload/readback reconciliation: `143/143`, `0` failures
- final live child/review/storage reconciliation: `143/143`, `0` failures
- bounded database image applies: `7`, covering each selected row exactly once
- final closeout proof: `5265dd26369e754ac2dd01c601c68304a4486af7f8d4a850367915cb91b07d2a`
- reviewer instruction PDF: rendered and visually verified as a single page
- permanent artifact hash inventory: review page, private image route, client, types, workflows, scripts, evidence, reconciliation, and PDF included

## Artifacts

- `docs/contracts/SPECIAL_VARIANT_SELF_HOSTED_REVIEW_V1.md`
- `docs/audits/special_variant_printing_self_hosted_evidence_v1/special_variant_printing_self_hosted_evidence_plan_v1.json`
- `docs/audits/special_variant_printing_self_hosted_evidence_v1/special_variant_printing_self_hosted_evidence_result_v1.json`
- `apps/web/src/data/review/specialVariantPrintingEvidenceV1.json`
- `docs/audits/special_variant_printing_authority_v1/health/special_variant_printing_health_v1.json`
- `docs/audits/special_variant_printing_self_hosted_evidence_v1/local_route_smoke_v1.json`
- `docs/audits/special_variant_printing_self_hosted_evidence_v1/POKEJAVI_SPECIAL_VARIANT_REVIEW_INSTRUCTIONS_V1.pdf`
- `scripts/audits/special_variant_printing_self_hosted_evidence_v1.mjs`
- `scripts/audits/special_variant_printing_review_gate_v1.mjs`
- `scripts/audits/special_variant_repair_amendment_v1.mjs`
- `scripts/audits/special_variant_exact_image_closeout_v1.mjs`
- `docs/audits/special_variant_printing_self_hosted_evidence_v1/special_variant_exact_image_closeout_v1.json`
- `.github/workflows/special-variant-self-hosted-evidence-v1.yml`
- `.github/workflows/special-variant-review-gates-v1.yml`

## What Must Never Be Broken

An acquired image is evidence, not approval. A confirmed image is not publication authority. Publication is not pricing authority. No child variant may become exact, visible, or priceable by inheriting a parent image, a discovery label, a shared-artwork assumption, or an external URL.

## Explicit Next Gate

The exact-image workstream is complete. Pivot to the separately governed production canary and run its read-only observer. Do not use this image confirmation as publication or pricing authority. Any future special-variant publication must create an explicit bounded authorization artifact, preserve all `143` image hashes, and canary a small visible subset before broader exposure.
