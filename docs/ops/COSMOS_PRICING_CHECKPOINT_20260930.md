# Cosmos pricing repair — September 30, 2026

Problem: product 609698 explicitly identifies Eevee SM184 Cosmos Holo. The
ordinary subtype resolver joined its generic Holofoil bucket to a generic holo
child. The special-product exclusion prevented a wrong price, but also left the
correct Cosmos printing unsupported.

The candidate change adds explicit Cosmos resolution and requires a reviewed
exact child mapping bound to the current product hash. A separate immutable
assignment version prevents reuse of generic holo assignments. Publication and
coverage use the same bounded exception. Other special-product exclusions remain.

Validation: 259 pricing contract tests pass, including MTG and Trainer Kit
regressions; release secret guard and diff checks pass. A verified-TLS PostgreSQL
test ran the migration against session-local temporary table copies, then rolled
everything back. It proved missing authority, hidden review, provisional child,
stale product hash, generic-child binding, conflicting subtype, and old generic
assignment rejection; valid exact authority plus a new Cosmos assignment qualified.
Assignment preparation was idempotent. Production definitions were unchanged.

Eevee's separately audited exact-printing repair committed at 23:16:17 UTC and
was independently verified at 23:16:21 UTC:

- parent `a4204779-6dd6-41f0-9e9c-eb87d202d19b`, `GV-PK-SM-SM184`;
- child `f172c1c4-d3c7-49ad-9d1c-3bda2274fb28`, `GV-PK-SM-SM184-COSMOS`;
- truth review `4ab0d066-5f03-45bb-8606-099f1d86db5b`;
- exact mapping `ab21ead5-7746-4684-9d6e-70c7bb38eb9d` to product 609698.

Archived product and price files were hash-verified; source photograph and
canonical image inspection were preserved from the parent mapping audit. Same
canonical SM184 identity, explicit Cosmos surface treatment; no separate release
identity, complete family coverage, or exact child image was inferred.
All 367 SM Promo parents, all 369 prior children, and all 183 prior reviews were
preserved. Final children: 370 (344 holo, 22 normal, 4 cosmos). No ownership,
price, publication, or existing printing changes. Generic holo stays separate
and is never Cosmos pricing authority. This was three inserts, not a cleanup.

Private evidence: `C:/grookai_vault_operator_artifacts/cosmos_pricing_support_20260930`
and `/var/lib/grookai/ops/cosmos-pricing-support-20260930`.
Repair fingerprint: `ea5ac95d0ff74d5309ea7ed7b7c9dcef8c4341b3b154539807410c09607d2953`.

At this checkpoint Eevee remains unavailable in the authenticated app. Software
release and governed publication/readback are still required. Do not confuse the
printing repair or temporary-table test with a published price. Preserve all
earlier mappings, quarantines, rollback pins, and the already-sent Funko inquiry.
