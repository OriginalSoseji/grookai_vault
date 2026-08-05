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
- The database still contains the original `143` hidden candidates and hidden review sidecars.
- No image confirmation, publication, or pricing mapping has been applied by this project.
- The `420` authority failures remain untouched.
- PokeJavi has not yet exported decisions for this packet.
- Founder confirmation therefore has not begun.
- The live read-only health check still reports `143` exact children, `143` exact hidden review sidecars, `0` public leaks, `0` hidden-child qualification candidates, `0` eligible price decisions, and `0` current prices.
- Two pre-existing TCGplayer product mappings point to a different canonical parent than this packet expects. The pricing executor treats either as a hard conflict and will never overwrite it implicitly.
- Tasks 1 through 3 are complete. Task 4 is implemented and ready for the reviewer. Tasks 5 through 7 are implemented but intentionally cannot execute before the required human artifacts exist.

## Verification

- focused self-hosted/review contracts: `11/11` passed
- web TypeScript: passed
- web lint: passed with zero warnings
- strict production web build: passed
- private review page unauthenticated smoke: `307` to sign-in
- private image route unauthenticated smoke: `401` with private `no-store`
- `git diff --check`: passed
- storage upload/readback reconciliation: `143/143`, `0` failures
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
- `.github/workflows/special-variant-self-hosted-evidence-v1.yml`
- `.github/workflows/special-variant-review-gates-v1.yml`

## What Must Never Be Broken

An acquired image is evidence, not approval. A confirmed image is not publication authority. Publication is not pricing authority. No child variant may become exact, visible, or priceable by inheriting a parent image, a discovery label, a shared-artwork assumption, or an external URL.

## Explicit Next Gate

Deploy the authenticated reviewer route from the frozen branch. PokeJavi signs in, reviews the `143` self-hosted images, and exports the first-pass JSON. Preserve that artifact unchanged. Founder review then imports it, confirms or rejects rows, and exports the separate founder artifact. Only afterward may the `image` gate run first as a bounded dry run of at most `25` rows.
