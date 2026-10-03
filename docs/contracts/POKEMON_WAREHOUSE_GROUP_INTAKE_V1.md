# Pokemon whole-group review ingress V1

This bounded operator executor repairs discovery starvation caused by loose
cross-set name/number hints. It does not change the independently deployed hourly
V1 intake or its policy. A hint remains `existing_identity_mapping_review`; it is
preserved verbatim in the new raw/discovery comparison and never becomes a link.

`pokemon_warehouse_group_intake_v1.mjs` requires a frozen complete category/group
product inventory of at most500 products, including unclassified products. Every
product is accounted as new review ingress, retained discovery lineage, or an
explicit hold. A subset cannot masquerade as a whole group. Existing discovery
requires the exact raw receipt and provider/product lineage. Orphan raw receipts
are held for reconciliation. Source payloads, group IDs and TCGCSV provenance are
preserved. No canonical set, parent, finish, mapping or promotion is authorized.

The automated qualification policy is honestly identified as
`whole_source_group_relationships_and_raw_lineage_v1`. It only permits staging
`AMBIGUOUS / PRINTED_IDENTITY_REVIEW`. It supplies no human review signature and
no physical identity/finish authority. Canonical admission requires separate
source-backed Master and per-set printing manifests and governed qualification.

The CLI accepts `--mode=plan|apply|verify`, `--out-dir=<new>` and a complete JSON
`--scope=<file>` in plan mode, containing `category_id`, `group_id`, and
`expected_product_ids`. Apply and verify require `--plan=<file>`; apply also
requires exact `--authorization=<file>` and `--producer-commit=<sha>`. Authorization
names the actual agent/operator and user request. Old V1 intake packages are
rejected. The producer must be clean and committed after normal repository hooks.
Credentials and verified CA are supplied through the established environment.

Apply acquires both the original intake transaction lock (so hourly intake is
excluded for the transaction) and its own group lock. It checks the complete
source group under row locks, freezes retained discovery/raw rows, rejects new
numeric or exact group-qualified mappings, and writes the whole eligible group
in one SERIALIZABLE transaction. Each new row passes the original source/number
checks plus exact upstream category/group checks. Original81 Classic rows are
not reinserted or rewritten. A single-card subset apply is rejected.

The source freeze also takes a transaction-level SHARE lock on the source-product
table: row locks alone cannot prevent a new product from entering the group after
the frozen inventory check. Ordinary readers continue; source writers wait only
for this bounded transaction. All source acquisition happens before the transaction.
The CLI applies 10-second lock and 90-second statement limits. Existing raw receipts
take FOR SHARE locks through commit and must identify exactly one source product;
contradictory raw product fields cannot qualify retained lineage. No worker is
stopped, reconfigured or redeployed.

Raw/discovery readback runs before commit, after commit on a separate read-only
connection, and during explicit verify. Group source and retained lineages also
must match. Operational job and immutable local pending/commit/failure receipts
record progress. An unknown commit must be independently reconciled before any
retry. An exact successful repeat validates all rows and creates no new ingress.
A subsequently changed candidate stops reconciliation rather than being reset.

Qualification includes pure group/negative tests and isolated PostgreSQL replay
using the captured raw/discovery/source column types and constraints. Unrelated
canonical relationship tables are synthetic in this fixture; this is not a full
schema migration replay. No schema changes belong to review ingress. Local proof
covers21-card rollback, atomic failure, retained81 preservation, source/raw drift,
new numeric/namespaced mapping conflicts, shared-lock exclusion, committed readback,
zero-write repeat and candidate drift. Competing connections also prove source
phantom inserts, existing source changes, and retained raw/discovery changes are
blocked through the transaction, with locks released after rollback. Canonical
admission remains a separate gate.
