# REPO_CLEANLINESS_AUDIT_V1

Date: 2026-03-04  
Scope: PROD_HARDENING_V1 Step 1.2 (audit/report only; no behavior/schema changes)

## Summary Counts
- BLOCKER: 0 (active)
- WARNING: 6
- INFO: 4

## Resolved Blocker (Prior Step)
- Secret containment completed in prior step:
  - Commit: `2d477c6`
  - Message: `chore(secrets): de-track env files and rotate BRIDGE_IMPORT_TOKEN`
  - Path remediated: `supabase/functions/import-prices/.env`

## A) Inventory Snapshot

### `git branch --show-current`
```text
main
```

### `git status --short --branch`
```text
## main...origin/main [ahead 1]
 M .flutter-plugins-dependencies
 M README.md
 M backend/clients/tcgdex.mjs
 M backend/pokemon/tcgdex_import_cards_worker.mjs
 M backend/pricing/ebay_browse_prices_worker.mjs
 M lib/card_detail_screen.dart
 M lib/screens/identity_scan/identity_scan_screen.dart
 M supabase/functions/pricing-live-request/index.ts
?? .tmp/
?? "PRISMATIC EVOLUTIONS MASTER SET LIST.xlsx"
?? backend/tools/set_repair_runner.mjs
?? backend/tools/tk_safe_printing_mapper.mjs
?? docs/audits/AUDIT_PRICING_L3_V1.md
?? docs/audits/EDGE_FUNCTION_BOUNDARY_AUDIT_2026-02-23.md
?? docs/checkpoints/PRICING_SURFACES_UNIFIED_RAW_V1_COMPLETE.md
?? docs/contracts/APP_FACING_DB_CONTRACT_V1.md
?? docs/contracts/PRICING_CONTRACT_INDEX.md
?? docs/contracts/PRICING_SURFACE_GUARD_V1.md
?? docs/plans/
?? docs/playbooks/PRICING_BACKTEST_V1_VS_V1_1.md
?? docs/playbooks/SET_REPAIR_PROTOCOL_V1.md
?? docs/playbooks/SET_REPAIR_RUNNER_V1.md
?? docs/playbooks/TK_SAFE_PRINTING_MAPPER_V1.md
?? "docs/playbooks/gv_playbook_mapping_v_1_tcgdex_↔_canon_external_mapping_repair.md"
?? prismatic-evolutions-printable-card-list-v0-yrfinpefj7ge1.webp
?? scripts/env_audit_db_poison.ps1
?? supabase/migrations/20260218093000_create_v_grookai_value_v1.sql
?? supabase/migrations/20260218100000_unify_pricing_surfaces_raw_only_v1.sql
?? supabase/migrations/20260218194847_repair_v_best_prices_all_gv_v1_unpriced_nulls.sql
?? supabase/migrations/20260218195500_create_v_grookai_value_v1_1.sql
```

### `git log -n 20 --oneline`
```text
2d477c6 chore(secrets): de-track env files and rotate BRIDGE_IMPORT_TOKEN
9698635 Close COMPLETE TK product sets via tcgdex_canonize_set runner; partial TK sets canonized as containers
9dac0f0 Add tcgdex canonize-set runner v1 (complete vs incomplete, deterministic, idempotent)
fb7ceb5 PROJECT CHECKPOINT: identity stable, pricing monotonic, TTL gate, backfill v1 operational
a7f76ed pricing: backfill worker v1 (high-value rarity, 25/hour, safe pagination)
01043b0 checkpoint: stable identity scan + catalog warehouse before submit-to-catalog UI
0923167 Identity UI: allow candidates to render when hintReady has results
1043e2d Identity worker: populate candidates via search_card_prints_v1
2c4eebd FEATURE V1.2: tap-to-focus + tap-to-expose + reticle (capability-guarded; shutter contract unchanged)
972b9be HARDEN V1.1: explicitly set scanner imageFormatGroup to yuv420 for deterministic quad detection
610b5b2 HARDEN V1: unify scanner shutter gate + prevent readiness divergence
8bd488d fix(identity): normalize aiIdentifyWarp response shape
0cbcfb2 fix(identity): require name for ai_hint_ready
2471b52 fix(identity-scan): stabilize upload, polling, and null-safety
5f82f04 fix(identity-scan): use identity-scans storage bucket
2eac2be ui(identity): show hint-ready state and update copy before resolver
b19ce96 identity: accept number+total as sufficient for ai_hint_ready
db05bc6 identity: harden signals (path normalization, ai-read-number authoritative)
70897d2 feat(identity): identity scanner v1 (scan → identify → add to vault)
47833b9 feat(fingerprint): resolve match candidate to canonical card_print and surface in UI (V1)
```

## C) Repo Hygiene Findings

### WARNING 1 — Root `.env` remains tracked (ambiguous class resolved as non-secret placeholder)
- Paths:
  - `.env`
  - `pubspec.yaml` (assets include `.env` and `.env.local`)
  - `lib/main.dart` (loads `.env.local`, then `.env`)
  - `apps/web/next.config.mjs` (loads root `.env.local` and `.env`)
- Audit result:
  - `.env` content is currently blank keys only (`SUPABASE_URL=`, `SUPABASE_PUBLISHABLE_KEY=`), no secret value present.
  - Runtime consumers use client-safe/public config keys.
- Decision:
  - Keep tracked in current state as non-secret fallback/template file.
  - Do not store server secrets in root `.env`.

### WARNING 2 — Generated/local artifact tracked
- Path:
  - `.flutter-plugins-dependencies`
- Rationale:
  - Generated Flutter dependency artifact is typically local/build output and is already listed in `.gitignore`.

### WARNING 3 — Temporary/proof artifacts are tracked in repo root
- Paths:
  - `kick_before.txt`
  - `last_run_log.txt`
  - `tmp_align.json`
  - `tmp_align2_log.txt`
  - `tmp_align2_slice.txt`
  - `tmp_align_log.txt`
  - `tmp_bump.txt`
  - `tmp_job_log.txt`
  - `tmp_log.txt`
  - `tmp_queue_view.txt`
  - `tmp_run.json`
  - `wf.txt`
  - `wf_before.txt`
  - `wf_curr.txt`
  - `wf_prev.txt`
  - `wf_view.txt`
  - `.codex/tmp_grookai_ci_task.md`
- Rationale:
  - These appear to be operational scratch/proof artifacts rather than durable product source.

### WARNING 4 — Migration hazard inventory present (quarantine + legacy stub footprint)
- Paths (representative):
  - `supabase/_migration_quarantine/20251127041609_remote_schema.sql`
  - `supabase/migrations/20251207150000_legacy_stub.sql`
  - `supabase/migrations/20251206140000_legacy_stub.sql`
  - `supabase/migrations/20251206120000_legacy_stub.sql`
  - `supabase/migrations/20251206113000_legacy_stub.sql`
  - `supabase/migrations/20251206110000_legacy_stub.sql`
  - `supabase/migrations/20251206090000_legacy_stub.sql`
  - `supabase/migrations/20251205090000_legacy_stub.sql`
  - `supabase/migrations/20251202000000_legacy_stub.sql`
  - `docs/legacy_migrations_v0/20251121030107_remote_schema.sql`
  - `docs/legacy_migrations_v0/20251120220749_remote_schema.sql`
  - `docs/legacy_migrations_v0/20251117042329_remote_schema.sql`
  - `docs/legacy_migrations_v0/20251117042207_remote_schema.sql`
  - `docs/legacy_migrations_v0/20251117004358_remote_schema.sql`
- Rationale:
  - High drift/confusion risk if developers do not follow strict migration playbooks.

### WARNING 5 — No `.editorconfig` at repo root
- Path:
  - `.editorconfig` (missing)
- Rationale:
  - Cross-tool formatting consistency relies on ad-hoc rules per subproject.

### WARNING 6 — Root README setup quality issues
- Path:
  - `README.md`
- Rationale:
  - Duplicate top heading and malformed/escaped quick-start formatting reduce setup clarity.

### INFO 1 — Committed build-directory scan
- Result:
  - No committed `node_modules/`, `.dart_tool/`, `build/`, `.next/`, `dist/`, or `coverage/` directories found.

### INFO 2 — Large binary/LFS scan
- Result:
  - No committed binary file near LFS-class thresholds observed.
  - Largest tracked binary assets are small:
    - `macos/Runner/Assets.xcassets/AppIcon.appiconset/app_icon_1024.png` (102,994 bytes)
    - `windows/runner/resources/app_icon.ico` (33,772 bytes)
    - `web/icons/Icon-maskable-512.png` (20,998 bytes)

### INFO 3 — WIP/TEMP marker scan
- Result:
  - No direct `TODO remove`/`WIP` hack markers in source logic.
  - `TEMP` matches were documentation/example paths and ignore comments.

### INFO 4 — Key/cert file tracking scan
- Result:
  - No tracked `*.pem`, `*.p12`, `*.key`, `*.crt`, or `service-account*.json` files.

## D) CI/Consistency Baseline

### README setup clarity
- Present but quality gaps exist (`README.md`, see WARNING 6).

### Formatting rule baseline
- `.editorconfig` missing (WARNING 5).

### Lint/format scripts
- Root `package.json`: worker scripts present; no root lint script.
- `apps/web/package.json`: `lint` script present (`next lint`).
- Flutter baseline: `flutter_lints` dependency declared in `pubspec.yaml`.

### Migration workflow docs discoverability
- Present and discoverable:
  - `scripts/drift_guard.ps1`
  - `scripts/migration_preflight.ps1`
  - `scripts/repair_remote_migration_history.ps1`
  - `docs/contracts/GV_MIGRATION_MAINTENANCE_CONTRACT.md`
  - `docs/MIGRATION_HEALTHCHECK_20251125.md`
  - `docs/GROOKAI_RULEBOOK.md`

## Actions Taken in This Step
- Documentation only:
  - Added `docs/release/REPO_CLEANLINESS_AUDIT_V1.md`
  - Added/updated release hardening docs in `docs/release/`
- No code/behavior/schema/worker changes.
- No additional cleanup removals executed in this step.

## Remaining Actions (Not Executed Here)
1. Decide and execute policy for tracked temp/proof artifacts in repo root.
2. Decide handling for tracked `.flutter-plugins-dependencies` (de-track vs intentional keep).
3. Define migration-footprint cleanup policy for quarantine/stub legacy files.
4. Add a root `.editorconfig` (if governance approves).
5. Repair README setup section formatting/accuracy.
