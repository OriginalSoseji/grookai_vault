# Collectr remaining card review — October 6, 2026

PR603 is live and its import is independently verified: 1,609 accounted copies,
550 retained source rows. Its production save is terminal; never replay it.
This review starts from main ddb7c764b. No product, schema, permission or inventory
change is included in this checkpoint.

The complete remaining-row ledger is source-bound to the unchanged export and
the complement of all 1,322 saved source groups. Every remaining row has an
action category; private records remain outside the repository.

Fresh read-only canonical catalog checks distinguish unresolved source set
scope, missing numbered candidates within a matched set, and names or printed
variants that disagree with same-number candidates. A missing scoped set is
not proof that the underlying foreign-language card is absent from every
catalog layer. Imported-language aliases must respect the governed canonical
admission and language identity boundaries. Never use number alone to replace
an unresolved Japanese card with an English card.

Graded source rows record PSA/CGC grade labels but no certificate numbers.
The current [slab contract](../contracts/GV_SLAB_CERT_CONTRACT_V1.md) anchors a
slab object to grader plus certificate number; the raw V2 writer also rejects
graded source rows independently in SQL. Neither boundary should be bypassed.
A user preference is pending between retaining these rows until certificates
are available and adding a distinct unverified graded-item import path.

If unverified graded items are chosen, preserve source grader, numeric grade,
label distinctions (including CGC Gem Mint versus Pristine), exact printing,
quantity and original source. Do not synthesize a certificate, call a raw copy
a verified slab, price it as raw, or silently expose it as a certified product.
Qualify ownership, display, pricing, source-aware retry and cross-client readback
before any save. This is a new capability, not a relaxed name-matching rule.

Operational evidence and continuation:
`C:/grookai_vault_operator_artifacts/collectr_card_review_20261006/CHECKPOINT.json`.
The private action ledger covers all unresolved rows. The previous live import
and its private receipts remain authoritative for existing inventory.
