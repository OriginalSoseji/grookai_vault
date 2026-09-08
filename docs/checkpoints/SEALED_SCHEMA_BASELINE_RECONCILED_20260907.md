# Sealed Ownership: Schema Baseline Reconciled

Date: 2026-09-07. Branch: `feature/sealed-owned-collectibles-v1`.
Worktree: `C:/grookai_vault_pokemon_sealed`.
Base commit: `0688a21a1d5f54c4d0c90dabfebe43927bb4e98a`.
Changes remain uncommitted. No production apply, Vault mutation, Storage change,
client deployment, or feature activation occurred.

This supersedes the open comparison investigation in
`SEALED_SCHEMA_RECONCILIATION_REPLAY_20260907.md`. Do not restart that investigation
or cycle through more diff engines without new contradictory evidence.

## Completed Prerequisite

- Strict linked baseline audit passes through the explicit, fingerprint-bound
  reconciliation path. The default raw-SQL diff path remains unchanged.
- Isolated `PrePush` passes for exactly `20260905120000,20260907160000`, including
  full fresh migration replay. Only the disposable project on ports 55430/55431
  was reset. The populated local project on port 54330 was preserved.
- 126 targeted contract tests pass, including tests using the actual pinned
  inspection engine. Real RLS changes, grants, view definitions, field types,
  defaults, nullability, generated expressions, and collation changes are not
  hidden by the normalization.
- 873 public relation/function security objects match in a fresh read-only
  comparison: owners, grants, column ACLs, forced RLS and function settings.
- Production sanity readback: 170,404 card prints, 3,397 sets, 32,903 traits.

The three investigated tables (`card_prints`, `pricing_jobs`, `sets`) have
different physical column order across production and fresh replay. Every named
column definition matches. Reordering only their in-memory inspection metadata
eliminates all 41 dependent-view recreation proposals. No live table or view
was modified. View/function output ordering remains significant.

The only remaining diagnostic SQL is the exact pending image-dimension
constraint difference, SHA-256
`8adf7031c9a2643f252a9ea88a466ae4ee205c4ef35f9c54a3dfa6d25e8d3c1d`.
This SQL describes replay-to-production differences; it is NOT an apply script.

## Pending Production Migrations

| Migration | File SHA-256 | Intended production effect |
| --- | --- | --- |
| `20260905120000_mtg_sealed_image_dimension_constraint_repair_v1.sql` | `d98f08ba73afcac510b1ae052ac35b0747c34816018900c6dba006f497f3f30e` | Reject partial/null dimension tuples; no image-data repair or deletion |
| `20260907160000_production_function_source_replay_reconciliation_v1.sql` | `ebaf5677fd4a20357dcb67340aaa50f0f1f0aa361d60cc386f10d819cd636755` | No-op on 32 exact live definitions; make fresh replay preserve their exact source bytes |

Production has 387 applied versions; these two local files are not applied.
Passing the baseline audit is not migration-ledger parity, a production apply,
or authorization to execute arbitrary pending migrations. Freeze/review the
repair commit and exact apply plan under existing migration governance before
any remote write. Do not reset production or run the generated broad diff.

## Verification Command

Run from the feature worktree with a NEW output directory each time:

```powershell
pwsh -NoProfile -File scripts/migration_preflight_strict.ps1 `
  -Phase AuditLinkedSchema -ReconciledReplayAudit `
  -ExpectedLocalOnlyIds 20260905120000,20260907160000 `
  -AuditEnvFile C:\grookai_vault\.env.local `
  -AuditOutDir C:\grookai_vault_operator_artifacts\sealed_ownership\<new-audit>
```

The Node reader requires verified system CA trust, the existing isolated Docker
container, exact replay/pending ledgers, pinned `@pgkit` 0.6.1 dependencies,
fingerprint-bound migration files and unchanged source/tool hashes during the
read. It records raw/reconciled SQL, security comparisons and artifact hashes.
It has no apply method and uses read-only transactions for both databases.

The first supplemental security probe failed because a PostgreSQL `name`-typed
UNION output truncated long overload signatures. This incorrectly paired two
overloads with different search paths. Casting the identity to `text` fixed the
probe; full signatures and security metadata match. No function was changed to
address this probe defect. The failed artifact is preserved.

## Exact Next Work

1. Preserve/review the narrow schema repair and its evidence. Complete its exact
   production apply/readback gate separately; do not claim it already ran.
2. Resume actual sealed ownership implementation from
   `docs/contracts/SEALED_OWNED_COLLECTIBLES_V1.md`: nullable sealed variant anchor,
   exactly-one anchor guards, condition fields, idempotent copy creation using
   the existing GVVI allocator, and transactional archive/sale/trade handling.
   Build and exercise this locally before production rollout.
3. Add typed reads for Vault/totals, Wall sections, vendor, GVVI, sharing/lots and
   transaction history. Never disguise a sealed variant as `card_print_id`.
4. Integrate Flutter and web behind default-off ownership flags. Test missing
   prices/images, multiple copies, partial trade/cash, privacy, retries,
   concurrent dispositions, and unchanged card/slab behavior.
5. Perform bounded owner canary and exact readback, then device/client parity
   acceptance before activation. No empty Add button or success without readback.

The existing build 314 remains sealed BROWSE only. None of the above ownership
flows are implemented or enabled by this checkpoint. White-background product
image isolation remains explicitly deferred.

## Artifacts

Root: `C:/grookai_vault_operator_artifacts/sealed_ownership/`.

- `20260907_strict_logical_audit_final/`: final read-only plan, raw/reconciled SQL,
  full security comparison, summary and artifact hashes.
- `20260907_strict_logical_audit_final.log`: strict audit execution transcript.
- `20260907_isolated_prepush.log`: exact pending-set and fresh replay pass.
- `20260907_reconciled_contract_tests_final.tap`: 126 passing tests.
- `20260907_logical_audit_v1/`: preserved failed full-signature probe.
- `20260907_foundation/column_order_all_public_engine_proof.json`: first engine
  proof identifying the three physical ordering differences.

Root worktree and existing user data remain preserved. The isolated replay
worktree's `supabase/config.toml` is test-only; do not commit its local project ID
or ports as production configuration. Installing pinned audit dependencies
replaced the feature worktree's `node_modules` link with a worktree-local install;
the root worktree's dependency directory remains present and unchanged.
