# Storefront production preflight — September 18, 2026 (America/Denver)

Status: live read-only diagnosis complete; **formal release gate blocked**.
No merge, remote migration, store grant activation, worker dispatch or deployment.

## Fresh production evidence

The canonical backend URL and linked-project metadata both identify
`ycdxbpibncqcchqiihfz`. Two fixed SQL files were executed with Supabase CLI 2.90.0
through an isolated local link-metadata directory. Both SQL payloads use a
repeatable-read, read-only transaction, bounded statement/lock timeouts and rollback.
They return counts and schema metadata, not user records or credential values.
The CLI reported login-role initialization; the SQL's `transaction_read_only`
readback was `on`. No application mutation, migration or entitlement write was sent.

| Check | Observed result |
|---|---|
| Canonical environment counts | 170,658 card prints; 3,399 sets; 32,903 traits |
| Applied migration ledger | 394 entries |
| Candidate migration inventory | 397 files |
| Remote-only migrations | None |
| Exact local-only set | `20260918040000`, `20260918070000`, `20260918100000` |
| Storefront tables/functions/bucket | Absent |
| Active store_app/store_web feature grants | Zero / zero |

`production-readiness.json` retains the sanitized result. These are current
production reads, not counts copied from an earlier checkpoint. They establish
the starting state, not deployed storefront behavior or billing readiness.

## Schema and dependency comparison

Only the retained dedicated local database
`supabase_db_grookai-storefront-verification-20260918` was restarted, without reset.
Its ledger remains 397, workers remain zero and all 397 migration files match the
earlier full replay hashes. No existing repair database or shared 543xx service
was used. Production and local metadata were captured by the same fixed query.

The diagnostic comparison covers 9,341 production entries and 9,494 local entries
across public relations, columns, constraints, indexes, functions, triggers, views
and public/Storage policies. Definition text is represented by database-computed
MD5 checksums to avoid copying possible embedded configuration values. Owners,
ACLs, RLS flags and function configuration are compared separately. This is a
diagnostic footprint, not the full governed schema inspection engine or proof
that every database object category is identical.

- 153 local-only entries correspond to objects declared by the three pending
  storefront migrations. The offline classifier identifies their declared scope;
  it does not approve every possible definition merely because its name matches.
- 22 differences on existing columns are position only, on the already documented
  `card_prints`, `pricing_jobs` and `sets` tables. All other compared properties of
  those columns match. No database order was changed or difference discarded.
- Zero unexplained differences were found in the compared metadata. Raw snapshots,
  complete differences and classification remain available.
- The compared printing-executor table scope (`card_printings`,
  `card_printing_truth_reviews`, `raw_imports`) and the definition/configuration of
  `get_public_card_printing_options_v1` match. This is not approval to reuse frozen
  repair plans: their exact producer-specific fingerprints still govern execution.
- The dependency query finds 95 production FKs pointing to its five selected
  public targets. The candidate adds `vendor_store_items -> vault_item_instances`
  and `vendor_store_sections -> wall_sections`. Other store-internal/auth-user FKs
  are present in the migration sources and outside that selected-target count.
- Two new entitlement triggers suspend store/custom publication on grant changes.
  Private Storage policies and the media bucket remain pending production changes.

The active catalog repair worktree remains dirty and untouched. Its September 18
checkpoint reports continued Prize Pack/source and anthology display work. No
repair manifests, approvals, fingerprints or source fixtures were rewritten.

## Concrete formal-gate blocker

The repository's actual `Get-ObjectDuplicates` implementation was executed
offline, together with only its two pure normalization helpers extracted via
PowerShell AST. No top-level preflight code, CLI call or reset branch was executed
by this scan. `strict-object-scan.json` records two redefinitions that the current
`PrePush` gate rejects:

| Signature | Pending migrations |
|---|---|
| `vendor_store_publish_v1(text, boolean)` | `20260918040000` creates it; `20260918070000` replaces it for custom products |
| `vendor_store_custom_mutate_v1(uuid, bigint, text, jsonb)` | `20260918070000` creates it; `20260918100000` replaces it to use PT409 conflicts |

There are no duplicate pending indexes or views. These replacements are intentional
and passed historical local replay, but that does **not** make the strict gate pass.
No skip, success marker or broad exception was introduced. The gate would stop at
the duplicate-function scan before its local reset.

The default `PrePush` reset also targets the checkout's shared configuration, so
it was not run. The existing scoped replay exceptions accept earlier sealed/cameo
packages, not this storefront package. `AuditLinkedSchema` includes pending objects
in its raw diff; the earlier column-order reconciliation is not automatically a
new storefront apply exception. This report deliberately records
`strictPrePushPassed: false`.

## Next implementation step

Reconcile the still-unapplied migration package with the strict gate, preserving
the current migration bytes and replay receipts as history. Either consolidate
the release-only pending definitions in a new isolated candidate and reprove the
entire chain, or implement a narrowly reviewed, exact-source-bound treatment of
these intentional replacements. Do not weaken duplicate detection generally or
silently edit the historical replay evidence.

Then provision a distinct disposable replay project with unused ports, internal
networking and workers disabled; run the formal isolated schema comparison and
pre-push replay there. Retain the current populated storefront proof database.
Recheck live ledger/dependency state and coordinate catalog repair before any
production schema application. Merge, apply, grants and release remain separately
authorized actions under the user's original scope.

## Reproducibility and preservation

Queries:
`scripts/audits/storefront_release_readiness_v1.sql` and
`scripts/audits/storefront_schema_footprint_v1.sql`.
Offline comparison:

```text
node scripts/schema/compare_storefront_footprints_v1.mjs --production=<production-schema-footprint.json> --replay=<local-schema-footprint.json> --output=<new-output.json>
node --test scripts/tests/storefront_preflight_comparison_v1.test.mjs
```

Four tests pass, covering key-order neutrality, narrow column-order classification,
changed/missing/undeclared objects, duplicate entries and read-only capture checks.
The output refuses to authorize an apply even when no unexplained differences remain.

No product code, migration, native source or previous audit receipt changed in
this step. Current main and PR #473 revisions are recorded in `final-readback.json`.
The one task database container was stopped afterward, retaining its volume.
`final-source.json` hashes the current candidate; the updated review patch is
`.local/integration/preflight-storefront.patch`. Private CLI metadata/logs stay
ignored. This report supersedes any implication that only release authorization
remains: migration-package reconciliation is now an evidenced prerequisite.
