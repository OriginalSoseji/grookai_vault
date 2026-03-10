# DRIFT_TRIAGE_REMOTE_ONLY_TABLES_V1

Date: 2026-03-05

## Scope
Audit-only triage for tables present in remote but absent after local replay:
- `public.admin_change_checkpoints`
- `public.ingestion_queue`
- `public.backup_card_printings_me025_20260226`
- `public.backup_card_prints_image_url_tcgdex_norm_v1`
- `public.backup_card_prints_sma_noncanon_44`

No schema changes performed.

## 1) Local Absence Proof (post-reset)
Executed after `supabase db reset --local`:
- `SELECT name, to_regclass(name) FROM (VALUES ...) AS v(name);`
- Result: all 5 returned `NULL` (`to_regclass` absent).

Evidence:
- `docs/release/logs/DRIFT_TRIAGE_local_absence.log`

## 2) Remote Truth Summary (read-only)
Per-table logs:
- `docs/release/logs/DRIFT_TRIAGE_remote_only_tables_admin_change_checkpoints.log`
- `docs/release/logs/DRIFT_TRIAGE_remote_only_tables_ingestion_queue.log`
- `docs/release/logs/DRIFT_TRIAGE_remote_only_tables_backup_card_printings_me025_20260226.log`
- `docs/release/logs/DRIFT_TRIAGE_remote_only_tables_backup_card_prints_image_url_tcgdex_norm_v1.log`
- `docs/release/logs/DRIFT_TRIAGE_remote_only_tables_backup_card_prints_sma_noncanon_44.log`

Notes on row counts:
- Direct `SELECT count(*)` on these tables is denied for the remote login role (`permission denied`).
- Exact row counts were derived from the remote `--data-only` dump parse as fallback (logged per table).

Cross-table findings:
- Inbound FKs: none for all 5 tables.
- Outbound FKs: none for all 5 tables.
- RLS: disabled (`rowsecurity = false`) for all 5.
- Policies: none for all 5.
- Grants: broad ACLs to `anon`, `authenticated`, `service_role` on all 5.

Remote row counts (fallback exact from data dump):
- `admin_change_checkpoints`: 38
- `ingestion_queue`: 2
- `backup_card_printings_me025_20260226`: 885
- `backup_card_prints_image_url_tcgdex_norm_v1`: 25972
- `backup_card_prints_sma_noncanon_44`: 44

## 3) Repo Usage Audit
Evidence:
- `docs/release/logs/DRIFT_TRIAGE_remote_only_repo_usage.log`

Findings:
- `admin_change_checkpoints`: active backend tooling usage in `backend/tools/set_repair_runner.mjs` (table existence checks + INSERT path).
- `ingestion_queue`: no repo references in Flutter/Edge/backend/docs scan.
- all `backup_*` targets: no repo references in Flutter/Edge/backend/docs scan.

## 4) Decision Matrix
| Table | Decision | Basis |
|---|---|---|
| `public.admin_change_checkpoints` | `KEEP_AND_CAPTURE` | Active backend tool dependency; remote rows present; no FKs blocking capture. |
| `public.ingestion_queue` | `DROP_CANDIDATE` | No repo usage found; low row count; no FK dependencies. |
| `public.backup_card_printings_me025_20260226` | `DROP_CANDIDATE` | Backup table pattern; no usage; no FK dependencies. |
| `public.backup_card_prints_image_url_tcgdex_norm_v1` | `DROP_CANDIDATE` | Backup table pattern; no usage; no FK dependencies. |
| `public.backup_card_prints_sma_noncanon_44` | `DROP_CANDIDATE` | Backup table pattern; no usage; no FK dependencies. |

## STOP-Gate Result
STOP gate triggered: active code path depends on `public.admin_change_checkpoints`.
- This blocks any “drop-only” path for all remote-only tables.
- No implementation/fix applied in this step.

## Next Single-Step Recommendation
Run a focused **capture DDL into migrations** step for `public.admin_change_checkpoints` (KEEP_AND_CAPTURE). Handle `DROP_CANDIDATE` tables in a separate, explicit drop migration step only after approval.
