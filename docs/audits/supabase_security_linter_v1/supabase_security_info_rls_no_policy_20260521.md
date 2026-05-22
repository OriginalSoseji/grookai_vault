# Supabase Security Info RLS No Policy V1 - 2026-05-21

## Scope

Remediate `rls_enabled_no_policy` informational Security Advisor findings for RLS-enabled tables that are intentionally not direct app-role surfaces.

## Migration

Created:

```text
supabase/migrations/20260521231500_security_info_rls_no_policy_v1.sql
```

## Policy Strategy

The migration adds explicit deny-all policies for `anon` and `authenticated`, and revokes direct table privileges from those roles. This preserves the existing closed posture while making it visible to the Supabase linter.

Tables covered:

- `public.audit_card_image_backfill_v1_backup_20260520`
- `public.collapse_map_phase1`
- `public.contract_violations`
- `public.justtcg_identity_overrides`
- `public.justtcg_set_mappings`
- `public.justtcg_variant_price_snapshots`
- `public.me03_master_set_repair_v1_card_print_species_backup_20260519`
- `public.me03_master_set_repair_v1_card_prints_backup_20260519`
- `public.me03_master_set_repair_v1_external_mappings_backup_20260519`
- `public.me03_master_set_repair_v1_warehouse_candidates_backup_20260519`
- `public.quarantine_records`
- `public.slab_provenance_events`
- `public.web_events`

## Access Notes

- Backup tables remain operator/service-only.
- Contract/quarantine ledgers remain service-role controlled.
- JustTCG helper/raw snapshot tables remain backend maintenance surfaces; public pricing reads use established read models/RPCs.
- `web_events` continues to be written through the server admin client, so app roles do not need direct table access.

## Verification

```powershell
supabase migration list --linked
pwsh -NoProfile -File .\scripts\migration_preflight_strict.ps1 -Phase PrePush -ExpectedLocalOnlyIds 20260521231500
supabase db push --dry-run
supabase db push --yes
supabase db advisors --linked --type security -o json
git diff --check
```

## Execution Result

Status: `APPLIED`

Remote migration applied:

```text
20260521231500_security_info_rls_no_policy_v1.sql
```

Pre-apply verification:

- `git diff --check`: passed.
- `supabase migration list --linked`: expected local-only migration was `20260521231500`.
- `pwsh -NoProfile -File .\scripts\migration_preflight_strict.ps1 -Phase PrePush -ExpectedLocalOnlyIds 20260521231500`: passed.
- `supabase db push --dry-run`: exactly one migration planned, `20260521231500_security_info_rls_no_policy_v1.sql`.

Post-apply verification:

- The listed `rls_enabled_no_policy` INFO rows are gone.
- No new direct app-role access is introduced.
- `supabase migration list --linked`: ledger aligned; `20260521231500` is present locally and remotely.
- `supabase db advisors --linked --type security -o json`: no `rls_enabled_no_policy` findings remain.
- Remaining Security Advisor findings are unchanged deferred/platform items:
  - 4 `authenticated_security_definer_function_executable` WARN rows for `execute_card_interaction_outcome_v1`, `vault_add_card_instance_v1`, and both `warehouse_intake_v1` overloads.
  - `auth_leaked_password_protection`
  - `vulnerable_postgres_version`
