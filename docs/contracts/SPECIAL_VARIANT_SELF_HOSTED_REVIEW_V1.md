# Special Variant Self-Hosted Review V1

## Status

Active.

## Purpose

Govern exact-image acquisition, human review, approval, publication, and pricing authorization for quarantined special-variant child printings.

## Core Rule

Every image shown or promoted by this workflow must be served from Grookai-controlled private storage.

External image URLs are provenance and acquisition inputs only. They are never stored as the active child image and are never rendered directly in the review portal or public application.

## Seven Gates

1. Discover an image from an authoritative product record.
2. Record source page, source product, payload hash, retrieval time, byte hash, dimensions, and content type.
3. Upload the immutable bytes to the private `user-card-images` bucket under `warehouse-derived/special-variant-printing-evidence-v1/` and verify by download.
4. Present only the self-hosted object to the first-pass reviewer. First-pass decisions are browser-local draft evidence and do not write the database.
5. Require a separate founder confirmation artifact bound to the same packet fingerprint and image hash.
6. Apply confirmed image/review status in bounded transactions while visibility remains `hidden_pending_review`.
7. Authorize public visibility and exact TCGplayer pricing mapping through separate bounded transactions.

## Evidence Roles

- `candidate_exact_variant_front`: product-bound image awaiting human confirmation.
- `confirmed_exact_variant_front`: founder-confirmed exact printing image.
- `representative`: useful display image that does not prove the printing marker.

Acquisition never promotes `candidate_exact_variant_front` to `confirmed_exact_variant_front`.

## Source Binding

TCGplayer image acquisition is valid only when:

- the frozen review row has an exact TCGplayer product ID;
- the active TCGCSV product row has the same ID, title, source page, and payload hash;
- the TCGCSV image URL encodes that same product ID;
- the fetched high-resolution image URL encodes that same product ID;
- the response is a valid JPEG or PNG card-shaped raster;
- storage readback reproduces the exact SHA-256, byte count, dimensions, and content type.

Product binding makes the image reviewable. It does not make the visual claim approved.

## Storage Boundary

- Bucket: `user-card-images`
- Evidence prefix: `warehouse-derived/special-variant-printing-evidence-v1/`
- Object path includes `card_printing_id` and full image SHA-256.
- Uploads use `upsert: false`.
- Existing objects may be reused only when full readback matches the frozen evidence observation.
- Signed URLs are never stored.
- Review routes proxy private objects through authenticated Grookai endpoints.

## Review Boundary

PokeJavi may record a first-pass decision:

- `exact_match`
- `needs_more_evidence`
- `wrong_card_identity`
- `wrong_variant_marker`
- `wrong_finish`
- `image_unusable`

The portal stores drafts in browser local storage and exports a JSON artifact. It performs no server or database writes.

Founder confirmation must import the first-pass artifact and may record:

- `confirmed`
- `needs_more_evidence`
- `rejected`

Publication and pricing authorization are independent row-level booleans. Neither is implied by image confirmation.

### Evidence Amendments

A founder rejection remains immutable. When later authoritative evidence proves that the image was correct but the stable printing label was misleading, or when a replacement exact image becomes available, the repair must be recorded as a separate amendment packet.

An amendment must:

- reference the original packet, evidence ID, image hash, and founder artifact hash;
- preserve the original decision unchanged;
- explain whether the repair is an authority/nomenclature correction or a replacement image;
- cite the source used to distinguish an unstamped participant/deck-exclusive printing from a stamped printing;
- self-host and hash-verify every replacement image before the image gate;
- use deterministic crop or perspective normalization only, never generative image editing;
- preserve `publication_authorized = false` and `pricing_authorized = false` unless those independent gates are explicitly approved later.

Stable printing IDs are not rewritten inside an image amendment. A misleading compatibility ID must be documented for a separately governed identity/display-label repair rather than silently mutated during image review.

## Apply Boundary

Image approval may write only:

- `card_printings.image_source`
- `card_printings.image_path`
- `card_printings.image_status`
- `card_printings.image_note`
- the existing active `card_printing_truth_reviews` review fields and evidence JSON

Image approval must leave `public_visibility = 'hidden_pending_review'`.

Publication may change only `card_printing_truth_reviews.public_visibility` from `hidden_pending_review` to `visible` for a verified row with the exact founder-confirmed self-hosted image.

Pricing authorization may create an exact active TCGplayer parent mapping only when no conflicting mapping exists. It never overwrites a conflicting mapping. Market qualification still resolves the child through the governed parent, exact finish, visible truth review, and ordinary publication policy.

## Invariants

- No external image hotlinking.
- No automatic image approval.
- No automatic public visibility.
- No automatic pricing mapping.
- No parent image overwrite.
- No canonical identity mutation.
- No approval from a representative image.
- No pricing authorization from image evidence alone.
- No batch larger than 25 for database transitions.
- No conflicting existing mapping is repaired by implication.
- Every transition is fingerprint-bound, transactionally read back, and auditable.
