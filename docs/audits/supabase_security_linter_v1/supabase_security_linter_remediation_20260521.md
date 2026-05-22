# Supabase Security Linter Remediation V1 - 2026-05-21

## Scope

Remediate the Supabase dashboard security advisor errors reported by the operator:

- `security_definer_view`
- `rls_disabled_in_public`

This lane does not address separate `supabase db lint --linked` function-body errors. Those are behavioral/function correctness issues and should be handled in a follow-up lane.

## Migration

Created:

```text
supabase/migrations/20260521183000_security_linter_remediation_v1.sql
```

## Security Definer Views

The following views are changed to `security_invoker = true`:

- `public.v_wall_cards_v1`
- `public.v_grookai_value_v1_clean`
- `public.v_wall_sections_v1`
- `public.v_justtcg_vs_ebay_classified_v1`
- `public.v_recently_added`
- `public.v_card_stream_v1`
- `public.v_justtcg_vs_ebay_valid_v1`
- `public.v_justtcg_display_summary_v1`
- `public.v_section_cards_v1`
- `public.v_vault_items_web`
- `public.v_card_contact_targets_v1`
- `public.v_grookai_value_v1_justtcg_bridge`
- `public.v_best_prices_all_gv_v1`
- `public.v_card_pricing_ui_v1`
- `public.v_justtcg_vs_ebay_pricing_v1`
- `public.v_vault_items`
- `public.v_vault_items_ext`
- `public.v_card_print_cameos_public_v1`

Expected effect:

- View access uses the querying role's permissions and underlying RLS behavior.
- Public read models no longer bypass caller permissions through view ownership.

## RLS Disabled Tables

RLS is enabled for:

- `public.me03_master_set_repair_v1_warehouse_candidates_backup_20260519`
- `public.card_fingerprint_index`
- `public.scanner_fingerprint_index`
- `public.contract_violations`
- `public.slab_certs`
- `public.slab_provenance_events`
- `public.collapse_map_phase1`
- `public.quarantine_records`
- `public.justtcg_variant_price_snapshots`
- `public.justtcg_variants`
- `public.justtcg_variant_prices_latest`
- `public.justtcg_set_mappings`
- `public.justtcg_identity_overrides`
- `public.audit_card_image_backfill_v1_backup_20260520`
- `public.me03_master_set_repair_v1_card_prints_backup_20260519`
- `public.me03_master_set_repair_v1_external_mappings_backup_20260519`
- `public.me03_master_set_repair_v1_card_print_species_backup_20260519`

## Policy Strategy

### Public read allowed

The following tables are app/product read surfaces and receive explicit select policies:

- `slab_certs`: public slab identity/provenance metadata used by public vault/card surfaces.
- `justtcg_variant_prices_latest`: public pricing read-model input.
- `justtcg_variants`: public pricing read-model input.

### Authenticated read allowed

The following scanner/helper indexes receive authenticated read policies:

- `card_fingerprint_index`
- `scanner_fingerprint_index`

### Direct public access revoked

Backup/internal/ledger tables have direct `anon` and `authenticated` privileges revoked and no permissive RLS policy added.

Service-role backend jobs are expected to continue working through service-role bypass.

## Separate Function Lint Debt

`supabase db lint --linked` also reported function errors unrelated to dashboard security advisor output:

- `extensions.index_advisor`: missing `hypopg_reset()`
- `ingest.merge_card_prints`: invalid `ON CONFLICT`
- `public.execute_card_interaction_outcome_v1`: ambiguous `admin_vault_instance_create_v1`
- `public.vault_add_or_increment`: invalid `ON CONFLICT`
- `public.vault_add_card_instance_v1`: ambiguous `admin_vault_instance_create_v1`
- `public.vault_post_to_wall`: references missing `vi.card_print_id`

These should be handled in a separate DB function correctness lane. The `vault_add_card_instance_v1` ambiguity is likely related to reported add-to-vault behavior and should be prioritized next.

## Verification Plan

Before remote apply:

```powershell
supabase migration list --linked
pwsh -NoProfile -File .\scripts\migration_preflight_strict.ps1 -Phase PrePush -ExpectedLocalOnlyIds 20260521183000
supabase db push --dry-run
```

After apply:

```powershell
supabase migration list --linked
supabase db advisors --linked --type security --level error -o json
supabase db lint --linked --level error --output json
npm run contracts:test
npm run contracts:runtime-health
npm --prefix apps/web run typecheck
npm --prefix apps/web run lint
npm --prefix apps/web run build
git diff --check
```

Manual smoke:

- public wall page
- public section page
- vault page
- card detail pricing
- network feed
- cameo search
- local community feed

## Execution Result

Status: `APPLIED`

Remote migration applied:

```text
20260521183000_security_linter_remediation_v1.sql
```

Pre-apply verification:

- `supabase migration list --linked`: expected local-only migration was `20260521183000`.
- `pwsh -NoProfile -File .\scripts\migration_preflight_strict.ps1 -Phase PrePush -ExpectedLocalOnlyIds 20260521183000`: passed.
- `supabase db push --dry-run`: exactly one migration planned, `20260521183000_security_linter_remediation_v1.sql`.

Post-apply verification:

- `supabase migration list --linked`: ledger aligned; `20260521183000` is present locally and remotely.
- `supabase db advisors --linked --type security --level error -o json`: `No issues found`.
- `supabase db lint --linked --level error --output json`: still reports the separate function lint debt listed above.
- `git diff --check`: passed.

The reported dashboard security advisor errors for `security_definer_view` and `rls_disabled_in_public` are remediated at the linked Supabase security advisor error level.

## No-Scope Confirmations

- No table data rewrite.
- No scanner changes.
- No pricing logic changes.
- No Species Dex denominator changes.
- No public child route changes.
