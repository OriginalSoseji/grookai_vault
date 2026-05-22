# Supabase Security Warning Remediation V2 - 2026-05-21

## Scope

Continue reducing the remaining Supabase Security Advisor warning set after:

```text
20260521213000_security_warn_remediation_v1.sql
```

This pass targets warnings that can be removed without revoking live app APIs outright.

## Migration

Created:

```text
supabase/migrations/20260521223000_security_warn_remediation_v2.sql
```

## Changes

### Extension in Public

Move `unaccent` from `public` to `extensions` when the linked project still has the extension in `public`.

`public.gv_norm_name(text)` keeps an explicit `search_path` of:

```sql
public, extensions
```

That preserves its older unqualified `unaccent(...)` call after the extension move.

### SECURITY DEFINER RPCs

Convert read-only and RLS-compatible app RPCs to `SECURITY INVOKER`, including:

- catalog/search RPCs
- public collector/profile read RPCs
- mobile vault read wrappers
- owner-scoped vault archive/metadata wrappers that already filter by `auth.uid()`
- condition snapshot insert wrappers backed by owner insert RLS
- legacy `vault_add_or_increment` bucket wrapper backed by owner insert/update RLS

### User Card Image RLS

Add owner policies to `public.user_card_images` so legacy user-photo RPCs can run under caller privileges:

- owner select
- owner insert
- owner update
- owner delete

### Internal Helpers

Revoke direct `public`, `anon`, and `authenticated` execution from internal maintenance/job/refresh/helper `SECURITY DEFINER` functions.

Service role and owner execution are not changed.

## Explicit Non-Goals

These functions remain architectural follow-up candidates because they depend on privileged helper behavior or broader workflow review:

- `vault_add_card_instance_v1`
- `execute_card_interaction_outcome_v1`
- `warehouse_intake_v1`

They should be rewritten or fronted by a non-public/internal execution path rather than blindly converted.

## Verification Results

Before apply:

```powershell
supabase migration list --linked
# PASS: exactly 20260521223000 was local-only.

pwsh -NoProfile -File .\scripts\migration_preflight_strict.ps1 -Phase PrePush -ExpectedLocalOnlyIds 20260521223000
# PASS: pending set matched and local replay passed.

supabase db push --dry-run
# PASS: would push only 20260521223000_security_warn_remediation_v2.sql.
```

Apply:

```powershell
supabase db push --yes
# PASS: applied 20260521223000_security_warn_remediation_v2.sql.
```

After apply:

```powershell
supabase migration list --linked
# PASS: 20260521223000 is present locally and remotely.

supabase db advisors --linked --type security --level warn -o json
# PASS: remaining warning classes reduced to the counts below.

supabase db lint --linked --level error --output json
# UNCHANGED: pre-existing DB lint errors remain listed below.

npm run contracts:test
# PASS: 74 tests passed.

npm run contracts:runtime-health
# PASS: ok=true.

npm run preflight
# PASS_WITH_DEFERRED_DEBT: 0 critical failures.

git diff --check
# PASS
```

Remaining Security Advisor warning counts after apply:

```text
auth_leaked_password_protection                       1
authenticated_security_definer_function_executable    4
vulnerable_postgres_version                           1
```

Remaining `authenticated_security_definer_function_executable` functions:

- `execute_card_interaction_outcome_v1`
- `vault_add_card_instance_v1`
- `warehouse_intake_v1`
- `warehouse_intake_v1` overload with reference hints payload

Removed from the warning set in this pass:

- `extension_in_public`
- all `anon_security_definer_function_executable`
- most `authenticated_security_definer_function_executable`

`supabase db lint --linked --level error --output json` remains unchanged from the pre-existing error set:

- `extensions.index_advisor`: `hypopg_reset()` does not exist.
- `ingest.merge_card_prints`: no unique or exclusion constraint matching the `ON CONFLICT` specification.
- `public.vault_post_to_wall`: stale `vi.card_print_id` reference.
```
