# CATALOG_SOURCE_NAME_BINDING_V1

Status: Active. Established 2026-11-12 for the authorized catalog repair supporting the Pokemon playables engine.

## Scope and authority

A source-name binding preserves a provider's label and an existing canonical label for one exactly identified card. It lives in the provider ownership row's provenance metadata and is scoped to the exact provider ID, canonical UUID, set, collector number, active identity reference/hash and immutable adjudication package.

Printed identity, canonical names, UUIDs, GV-IDs and existing identity hashes retain their authority under `CARD_PRINT_IDENTITY_SUBSYSTEM_CONTRACT_V1`. The binding cannot edit, merge, reactivate or replace them. Alternate provider identifiers continue through `EXTERNAL_MAPPING_ALIAS_GOVERNANCE_CONTRACT_V1`; a name binding introduces no invented upstream identifier.

The initial package covers only TCGdex `me03-021`, `me03-055`, `me03-062`, `me03-081`, `me03-082`. Exact stored/source label pairs, parent UUIDs and identity hashes must be compiled into the approved package registry. The operation adds one source owner per parent and records the label binding; all original canonical and ownership data remains protected.

## Admission and execution

- Preserve unmodified original provider card/set responses in `raw_imports` before normalization, with URLs, observed times and hashes. Preserve supporting original reference artwork privately; it does not enrich canonical images.
- Require a complete, Master-admitted English physical set and card identity with at least two independent named sources agreeing on the exact source name, set and number. A model's interpretation of a picture or string similarity cannot admit an identity.
- Require one existing current canonical parent at the exact set/number/variant, one consistent active identity verified through the existing canonical hash authority, and an explicit adjudication of its exact stored label against the Master/source label.
- Missing source ownership may be added only by a bounded pinned catalog package with raw-first source evidence, schema/duplicate/owner checks, protected-state proofs, rollback proof, atomic commit, durable readback and idempotency. The competitive engine is a reader of those results.
- Store the binding in `external_mappings.meta.source_name_binding`, version `catalog_source_name_binding:v1`. Retain both exact labels, source/card IDs, canonical and identity references, evidence hashes, Master fact digest and the immutable authority-package fingerprint.
- The registry and reader must verify the whole bounded assertion against the current mapping and canonical identity. Unknown packages, stale identities, moved owners, changed labels or altered assertions fail closed.

## Consumer obligations

Backend evidence readers may accept the approved source name for that exact mapped card while preserving the stored canonical name. All set/number/domain/visibility, single-owner, current-identity and source-origin checks still apply. Source-specific adjudication cannot become an accent-stripping, punctuation-stripping, `EX`-to-`ex`, substring or fuzzy global normalizer.

The binding establishes source-label correspondence only. Gameplay equivalence, deck-copy limits, exact-print legality, artwork classification, qualification and source publication rights retain their independent gates. Search, badges and clients cannot approve bindings or acquire authority by reading the metadata field alone.

Source and package evidence supporting canonical ownership survives competitive 30-day retention. Package, writer and source receipts remain private and replayable. Only the five missing provider ownership rows are authorized. No schema, parent/identity, printing, image, pricing, existing mapping or collection ownership mutation is authorized by this contract.
