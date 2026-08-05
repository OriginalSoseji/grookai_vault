# Special Variant Exact Image Review Closeout V1

## Status

Complete at the hidden exact-image boundary.

## Context

The special-variant printing authority pass created `143` exact child candidates and hidden review sidecars. Image acquisition self-hosted `143` candidate images, but human review confirmed only `133` on the first pass. Ten rows remained rejected because of missing/unclear marker evidence or unacceptable image presentation.

## Problem

The project could not close the image gate while ten rows were unresolved. Four rejections were caused by compatibility IDs that implied a visible stamp even though authoritative distribution evidence described an unstamped deck-exclusive or participant printing. Five rows needed a different exact marker image, one needed a normalized exact listing image, and one padded catalog image needed deterministic cropping.

## Risk

An unsafe repair could rewrite immutable human decisions, mutate stable printing identity, treat a Winner image as a non-Winner printing, generate card pixels, hotlink external media, overwrite canonical parent images, expose hidden rows, or attach pricing authority to visual evidence.

## Decision

Preserve the original founder artifact unchanged and create a separate `SPECIAL_VARIANT_REPAIR_AMENDMENT_V1` packet bound to the original packet, evidence IDs, image hashes, and founder artifact hash.

- Authority/nomenclature corrections cite distribution evidence and retain stable IDs for compatibility.
- Replacement images are copied into immutable private Grookai storage.
- Salazzle and Teal Mask Ogerpon use deterministic perspective/crop normalization only.
- No generative image editing is permitted.
- Image, publication, and pricing gates remain independent.
- The image gate leaves every row `hidden_pending_review`.

## Alternatives Rejected

- Rewriting the ten original founder decisions was rejected because review evidence is immutable.
- Renaming stable GV-IDs inside an image repair was rejected because identity changes require a separate governed migration.
- Using the Flygon Winner image for the non-Winner participant printing was rejected even though it was higher resolution.
- Keeping marketplace backgrounds when a clean product-bound image was available was rejected.
- Publishing or pricing confirmed images in the same transaction was rejected because image truth is not market or visibility authority.

## Evidence Repair Result

- amendment rows: `10`
- improved replacement/normalized images: `9`
- exact existing image retained: `1` (Flygon non-Winner)
- deterministic normalized images: `2`
- immutable private storage readbacks: `10/10`
- founder-confirmed amendment decisions: `10/10`
- publication authorizations: `0`
- pricing authorizations: `0`
- database writes during acquisition: `0`

The four authority-sensitive rows are:

- Sawsbuck 16/236: Build & Battle-exclusive Non-Holofoil; no prerelease stamp is expected.
- Beldum 022: Non-Holofoil participant printing; no Winner stamp is expected.
- Chimecho 024: Non-Holofoil participant printing; no Winner stamp is expected.
- Flygon 025: Non-Holofoil participant printing; no Winner stamp is expected.

## Bounded Apply Proof

The image gate ran seven rollback proofs followed by seven exact applies:

- `25 + 25 + 25 + 25 + 25 + 8 = 133` original confirmations
- `10` amendment confirmations
- total selected exactly once: `143`

Every apply proved:

- exact child and active review binding;
- exact storage path and image hash;
- child image status `exact`;
- review status `verified`;
- visibility `hidden_pending_review`;
- zero publication updates;
- zero pricing mapping inserts;
- identical canonical parent fingerprints before and after.

## Final Readback

The independent closeout downloaded and re-observed every active image and read the live child/review state.

| Proof | Result |
| --- | ---: |
| Expected rows | 143 |
| Exact child images | 143 |
| Verified hidden reviews | 143 |
| Private storage hash readbacks | 143 |
| Founder-confirmed rows | 143 |
| Public rows | 0 |
| Current priced rows | 0 |
| Canonical parent rows changed | 0 |
| Reconciliation failures | 0 |

Closeout proof hash:

`5265dd26369e754ac2dd01c601c68304a4486af7f8d4a850367915cb91b07d2a`

## Current Truths

- Exact-image review is complete for all `143` authority-qualified children.
- All `143` remain hidden.
- Image confirmation has not authorized publication or pricing.
- Conflicting pre-existing parent mappings were preserved and not repaired by implication.
- The `420` authority failures remain blocked and unchanged.
- The broader exact-image acquisition backlog is a separate catalog project and is not part of this closeout.

## Invariants

- An exact image is evidence for a child printing, not canonical identity authority.
- A confirmed image does not authorize public visibility.
- Public visibility does not authorize pricing.
- A higher-resolution wrong variant is never preferable to a lower-resolution exact variant.
- Original human decisions and source evidence remain immutable.
- External URLs remain provenance only; active images must be Grookai-hosted.
- No blocked candidate may inherit authority from these `143` rows.

## What Must Never Be Broken

Do not replace any of the `143` exact paths without a new hash-bound review amendment. Do not reinterpret the four nomenclature corrections as permission to collapse Winner/non-Winner or stamped/unstamped printings. Do not make these rows public or priceable from the image artifacts alone.

## Permanent Artifacts

- `docs/audits/special_variant_printing_self_hosted_evidence_v1/founder_review_v1/`
- `docs/audits/special_variant_printing_self_hosted_evidence_v1/founder_amendment_v1/`
- `docs/audits/special_variant_printing_self_hosted_evidence_v1/review_gate_runs/`
- `docs/audits/special_variant_printing_self_hosted_evidence_v1/special_variant_exact_image_closeout_v1.json`
- `docs/audits/special_variant_printing_self_hosted_evidence_v1/special_variant_exact_image_closeout_v1.md`
- `docs/audits/special_variant_printing_self_hosted_evidence_v1/special_variant_exact_image_closeout_artifact_hashes.sha256`

## Explicit Next Gate

Pivot to the frozen production canary and run its read-only observation gate. Special-variant publication remains a future, separately authorized bounded canary after the production release gate is healthy.
