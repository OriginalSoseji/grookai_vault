# Supabase Security Warning Remediation V1 - 2026-05-21

## Scope

Reduce warning-level Supabase Security Advisor findings without changing product behavior or broadening data access.

This is a follow-up to the error-level remediation already applied in:

```text
20260521183000_security_linter_remediation_v1.sql
```

## Migration

Created:

```text
supabase/migrations/20260521213000_security_warn_remediation_v1.sql
```

## Remediated Classes

### Function Search Path Mutable

Project-owned functions in `public` without an explicit `search_path` are altered to:

```sql
set search_path = public
```

Extension-owned functions are excluded from the dynamic update.

### Public Bucket Allows Listing

The broad `storage.objects` policy for `identity-images` is dropped:

```text
identity-images read
```

The bucket can remain public for direct object URLs; broad object listing through the API is removed.

### RLS Policy Always True

The anonymous `waitlist_insert_public` policy is tightened from `with check (true)` to a bounded shape check:

- email-like value
- email length <= 320
- optional source length <= 120

### Materialized View in API

Direct API grants are revoked from:

- `public.wall_thumbs_3x4`
- `public.latest_card_prices_mv`
- `public.latest_prices`

Public/API consumers should use governed views or RPCs instead of direct matview access.

### Public Can Execute Security Definer Function

Anonymous direct access is revoked from write/internal/security-definer functions, including:

- condition snapshot inserts
- embedding lookup
- job processing/logging
- refresh functions
- vault mutation functions
- warehouse intake functions
- local community block helper

Intentional public read/search/profile RPCs are not changed in this phase.

### Trigger/Helper Direct Execution

Direct `public`, `anon`, and `authenticated` EXECUTE is revoked from trigger/helper functions that should only execute as table triggers or internal helpers.

## Deferred/Manual Classes

These warnings are not fixed by this migration:

- `extension_in_public`: moving `unaccent` out of `public` is a separate compatibility lane.
- `auth_leaked_password_protection`: must be enabled in Supabase Auth settings.
- `vulnerable_postgres_version`: must be handled through Supabase platform upgrade flow.
- `authenticated_security_definer_function_executable`: many authenticated RPCs are intentionally callable app APIs and need per-function contract review before changing.

## Verification Results

Before apply:

```powershell
supabase migration list --linked
# PASS: exactly 20260521213000 was local-only.

pwsh -NoProfile -File .\scripts\migration_preflight_strict.ps1 -Phase PrePush -ExpectedLocalOnlyIds 20260521213000
# PASS: pending set matched and local replay passed.

supabase db push --dry-run
# PASS: would push only 20260521213000_security_warn_remediation_v1.sql.
```

Apply:

```powershell
supabase db push --yes
# PASS: applied 20260521213000_security_warn_remediation_v1.sql.
```

After apply:

```powershell
supabase migration list --linked
# PASS: 20260521213000 is present locally and remotely.

supabase db advisors --linked --type security --level warn -o json
# PASS: warning classes removed by this migration no longer appear.

npm run contracts:test
# PASS: 74 tests passed.

npm run contracts:runtime-health
# PASS: ok=true.

npm run preflight
# PASS_WITH_DEFERRED_DEBT: 0 critical failures.

git diff --check
# PASS
```

Remaining warning counts after apply:

```text
anon_security_definer_function_executable             10
auth_leaked_password_protection                        1
authenticated_security_definer_function_executable    51
extension_in_public                                    1
vulnerable_postgres_version                            1
```

Remaining anonymous security-definer warnings are the intentionally exposed read/search/profile RPCs:

- `get_market_price`
- `list_set_codes`
- `public_collector_follow_counts_v1`
- `public_collector_relationship_rows_v1`
- `public_discoverable_card_copies_v1`
- `public_shared_card_primary_gvvi_v1`
- `public_vault_instance_detail_v1`
- `search_card_prints_v1`
- `search_cards`
- `search_print_identity_v1`

`supabase db lint --linked --level error --output json` remains unchanged from the pre-existing error set:

- `extensions.index_advisor`: `hypopg_reset()` does not exist.
- `ingest.merge_card_prints`: no unique or exclusion constraint matching the `ON CONFLICT` specification.
- `public.vault_post_to_wall`: stale `vi.card_print_id` reference.

Follow-up smoke focus:

- public search still works
- public profile/wall reads still work
- signed-in add-to-vault still works
- warehouse submit still requires intended auth/session path
- direct storage object URLs for `identity-images` still render

## No-Scope Confirmations

- No table data rewrite.
- No scanner changes.
- No pricing logic changes.
- No Species Dex denominator changes.
- No public child route changes.
- No DB remediation beyond explicit grants/policies/function attributes.
