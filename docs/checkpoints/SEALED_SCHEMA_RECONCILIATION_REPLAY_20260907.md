# Sealed Schema Reconciliation Replay - 2026-09-07

## Status

The sealed ownership prerequisite repair is prepared and tested in isolation.
It is not applied to production. Sealed Vault, Wall and transaction integration
are still incomplete and have not been enabled on any client.

Primary worktree: `C:/grookai_vault_pokemon_sealed`, branch
`feature/sealed-owned-collectibles-v1`, starting SHA
`0688a21a1d5f54c4d0c90dabfebe43927bb4e98a`.
The changes are local and uncommitted; no PR, deployment or app build was made.
Preserve the original uncommitted ownership foundation work.

Recovery worktree: `C:/grookai_vault_sealed_schema_reconcile`, branch
`fix/sealed-schema-replay-line-endings-v1`, same starting SHA. Its three local
`supabase/config.toml` changes select project
`sealed-ownership-replay-20260907`, database port 55430 and shadow port 55431.
These are test-only settings, not production configuration to commit or deploy.
The primary feature worktree also contains the identical repair SQL and tests.

## Corrected Diagnosis

The prior foundation checkpoint described matching ledgers too broadly.
The live ledger has no remote-only IDs, but one existing local file is not
applied: `20260905120000_mtg_sealed_image_dimension_constraint_repair_v1.sql`.
Having the same maximum migration version does not establish complete parity.
Preflight now explicitly reports local-only IDs and no longer calls that state
complete ledger parity. Its non-empty-diff failure remains in place.

Direct read-only snapshots from canonical production and PostgreSQL 17.4 local
replay establish:

- 32 function bodies differ solely in CRLF versus LF bytes. Other captured
  function fields match. Do not globally normalize SQL whitespace or literals.
- All 106 public view definitions, owners, options and captured column metadata
  match. One raw ACL array has a different entry order, with the same role/grant
  entries. There is no justification to replace these views from that evidence.
- `card_prints` has 36 visible columns in both environments. The diff engine's
  relation query differs only in physical position for eight columns:
  `number_plain` is position 30 live and 13 in replay; seven later columns are
  correspondingly shifted. Types, generation/default expressions and other
  returned semantic fields match. The baseline defines the generated column at
  position 13; production retains a different physical layout.
- The cached `@pgkit/schemainspect` 0.6.1 comparison serializes column maps in
  insertion order, and its compatibility check compares ordered column arrays.
  This explains the table-order difference propagating into dependent-view
  recreation proposals even though those view definitions match directly.

Do not drop/recreate the card table, move physical columns, edit system catalogs,
drop dependent views, or claim strict preflight passes to hide this discrepancy.
Logical-equivalence treatment must be explicit, evidence-backed and tested; it
is not implemented by the reporting repair in this checkpoint.

## Prepared Repair

`supabase/migrations/20260907160000_production_function_source_replay_reconciliation_v1.sql`
restores only the 32 exact LF replay definitions to their observed production
CRLF bytes. It does nothing when the production definition is already present.
Every overload has before/after SHA-256 guards. Unknown definition or configuration
changes, missing functions and wrong readback abort the transaction.
It does not recreate views, change grants/owners or modify user/catalog rows.

Working-file SHA-256:
`ebaf5677fd4a20357dcb67340aaa50f0f1f0aa361d60cc386f10d819cd636755`.
This is a prepared file hash, not a committed production execution authority.

## Verification

- Full `supabase db start` and `supabase db reset --local --yes` succeeded in
  the isolated test project, including the new reconciliation migration.
- All 32 replayed definitions match frozen production SHA-256 values.
- A second apply changed zero function catalog rows (including `xmin`) and
  zero views. All 106 local public view definitions were preserved.
- Transactional LF-to-CRLF recovery preserves owners, ACLs, security-definer
  flags and search paths. Injected semantic and configuration changes fail and
  roll back. A missing-function fixture also fails without partial repair.
- 108 selected Node contract tests pass: existing ownership/card/sealed checks,
  reconciliation guards, pending-ledger reporting and image dimension repair.
- No production writes, Vault mutations, Storage changes, price publication,
  signing changes or client deployment. The original populated local Supabase
  database on port 54330 was not reset or deleted.

## Tooling Failures And Recovery

The new project initially had a cold Docker/Deno package cache. CLI comparison
failed with `UnknownIssuer` while fetching npm dependencies. The working
project's existing cache was copied read-only into the new project's separate
cache using a network-disabled helper container. No TLS verification was
disabled, no existing cache was changed, and no credentials were copied.

The resulting cached default-engine comparison completes. Function replacements
are gone; the known pending dimension constraint and view-recreation proposals
remain. The alternative `--use-pg-schema` engine fails on its unsupported
`binder_members_alias_check` UDF-dependent check constraint. This is not proof
of a broken binder or permission to remove that constraint. All logs remain.

The first local patch generator correctly aborted before producing SQL because
JavaScript replacement-string handling interpreted a literal dollar sequence in
one regex. A literal-returning callback fixed generation. The full-definition
hash assertions and real PostgreSQL replay prove the source text was preserved.

## Exact Next Work

Superseded by `SEALED_SCHEMA_BASELINE_RECONCILED_20260907.md`: the scoped strict
comparison and isolated PrePush now pass. The list below records the earlier
investigation state; do not restart physical-column-order diagnosis.

1. Address the strict comparison's physical-column-order handling using the
   preserved snapshots and a tested, narrow logical-equivalence policy. Keep
   real type/default/constraint/grant changes blocking; do not suppress raw
   differences indiscriminately or run the generated drop statements.
2. Commit and review the forward reconciliation. Freeze a migration plan that
   distinguishes the existing pending dimension repair from this no-op-on-live
   repair; complete the exact pending-set and replay gates before any apply.
3. Implement the sealed ownership schema/RPCs, exact-copy lifecycle, typed
   readers and both clients from `SEALED_OWNERSHIP_FOUNDATION_20260907.md`.
4. Prove add/readback, mixed totals, Wall sections, sale/trade/cash, removal,
   sharing, privacy, retries and card regressions before enabling the feature.

Do not present the 108 passing offline tests as end-to-end sealed ownership.

## Artifacts

Root: `C:/grookai_vault_operator_artifacts/sealed_ownership/20260907_foundation/`.

| File | SHA-256 |
| --- | --- |
| `schema_classification.json` | `cff3fcec67ff54d77e5ad3ff02e513ad03dc03c7374edc921e3a1d52e5683ed7` |
| `reconciliation_proof.json` | `d688ebfb002e8bdc01526b2bbc027e1a7e152c367651b6ba949c34e462a0ab20` |
| `isolated_replay.log` | `72d749b1690a2f323e226093f11317d85afe2176b80f90721f62ea4e70c1a053` |
| `card_table_metadata_comparison.json` | `1040f36436042fe55939c04ac444435d86590d8421f82932e49db719c06254aa` |
| `view_metadata_comparison.json` | `f4641888b8377ea839ad66269033376f2345d332ee5601a75d7aa3492f2106c2` |

Also retained: `resumed_contract_tests.tap`, `default_view_metadata_comparison.json`,
all `reconciled_*.log` attempts, and the read-only/proof/generation scripts.
No required execution session remains running. The isolated database and cache
are retained for the next replay, separately from the original local environment.
