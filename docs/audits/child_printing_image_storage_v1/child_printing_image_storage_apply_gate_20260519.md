# CHILD_PRINTING_IMAGE_STORAGE_V1 Apply Gate

Date: 2026-05-19

## Decision

Status: APPLIED_AND_VERIFIED

The missing local migration files were restored from Git history, the linked
migration ledger became clean except for the expected local-only migration, and
the image storage migration was applied through the normal Supabase migration
path.

Applied migration:

- `20260519163000_child_printing_image_storage_v1.sql`

No migration repair, dashboard SQL, or `--include-all` path was used.

## Restored Local Migrations

The prior blocker was incomplete local migration history. These files were
restored into `supabase/migrations` before continuing:

- `20260518180000_child_printing_public_identity_v1.sql`
- `20260519151000_warehouse_image_reference_context_v1.sql`

After restore, `supabase migration list --linked` showed:

- `20260518180000`: local and remote
- `20260519151000`: local and remote
- `20260519163000`: local-only expected pending migration

## Preflight Result

- Branch: `scanner-v4-card-present-gate`
- Starting lane HEAD: `d00d2737`
- Prior gate doc commit: `15e1484f`
- Preflight command: `npm run preflight`
- Preflight result: `PASS_WITH_DEFERRED_DEBT`
- Diff whitespace check: passed

Known unrelated dirty files excluded from this gate:

- `.flutter-plugins-dependencies`
- `.gitignore`
- `backend/pricing/justtcg_domain_ingest_worker_v1.mjs`
- `docs/audits/pokemon_master_set_audit_v1/`
- `docs/ops/PRICING_HIGHWAY_REPAIR_PLAN_V1.md`
- `scripts/audits/pokemon_master_set_audit_v1.mjs`

## Migration Audit

Migration inspected:

`supabase/migrations/20260519163000_child_printing_image_storage_v1.sql`

Findings:

- Adds only nullable image fields to `public.card_printings`.
- Adds comments documenting child-printing image semantics.
- Does not update parent `public.card_prints` image fields.
- Does not promote warehouse candidates.
- Does not copy images automatically.
- Does not modify pricing.
- Does not touch scanner code.
- Does not change Species Dex denominator logic.
- Does not enable public child routes.
- Updates warehouse action constraints to include `ENRICH_CARD_PRINTING_IMAGE`.
- Keeps existing warehouse actions valid:
  - `CREATE_CARD_PRINT`
  - `CREATE_CARD_PRINTING`
  - `ENRICH_CANON_IMAGE`
  - `BLOCKED_NO_PROMOTION`
  - `REVIEW_REQUIRED`

## Strict Gate

Result: PASS

The strict guard initially exposed a tooling deadlock in its command runner:
`supabase db reset --local --yes` emits enough output to deadlock when stdout is
read to completion before stderr. The guard runner was fixed to read both
streams asynchronously.

Strict gate command:

```powershell
pwsh -NoProfile -File .\scripts\migration_preflight_strict.ps1 -Phase PrePush -ExpectedLocalOnlyIds 20260519163000
```

Strict gate proof:

- expected local-only migration set matched: `20260519163000`
- pending migration object scan passed
- local replay/reset passed
- restored migrations replayed successfully
- pending image storage migration replayed successfully

## Remote Read-Only Precheck

Result: PASS

Before apply:

- `public.card_printings` existed.
- Target child image columns were absent.
- `card_printings.printing_gv_id` populated count was `44,698`.
- Warehouse constraints did not yet include `ENRICH_CARD_PRINTING_IMAGE`.
- No partial child image storage schema was present.

## Dry Run

Result: PASS

Command:

```powershell
supabase db push --dry-run
```

Dry-run output listed exactly one migration:

- `20260519163000_child_printing_image_storage_v1.sql`

## Apply Result

Result: APPLIED

Command:

```powershell
supabase db push --yes
```

Applied exactly:

- `20260519163000_child_printing_image_storage_v1.sql`

## Post-Apply Verification

Result: PASS

Remote verification:

- migration ledger aligned through `20260519163000`
- child image columns exist on `public.card_printings`
- all six child image columns are nullable text fields
- `ENRICH_CARD_PRINTING_IMAGE` is allowed by warehouse action constraints
- `card_printings.printing_gv_id` populated count remained `44,698`
- child image populated count is `0`
- no image data was seeded by the migration

App verification:

- `npm --prefix apps/web run typecheck`: pass
- `npm --prefix apps/web run lint`: pass with existing `<img>` warning in `WarehouseSubmissionForm.tsx`
- `npm --prefix apps/web run build`: pass with same existing warning
- `npm run contracts:test`: pass, 74 tests
- `npm run contracts:runtime-health`: pass
- `git diff --check`: pass

## Safety Confirmation

- No parent image overwrite occurred.
- No warehouse candidate was promoted.
- No pricing change was made.
- No scanner change was made.
- No Species Dex denominator change was made.
- No public child route was enabled.
