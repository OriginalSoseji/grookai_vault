# Supabase Security Definer Service Entrypoints V1 - 2026-05-22

## Scope

Remediate the remaining `authenticated_security_definer_function_executable` WARN rows without removing the privileged behavior required by live write paths.

Affected functions:

- `public.execute_card_interaction_outcome_v1(...)`
- `public.vault_add_card_instance_v1(...)`
- `public.warehouse_intake_v1(...)`
- `public.warehouse_intake_v1(..., p_reference_hints_payload jsonb)`

## Migration

Created:

```text
supabase/migrations/20260522001500_security_definer_service_entrypoints_v1.sql
```

The migration adds service-role-only entrypoints:

- `public.execute_card_interaction_outcome_service_v1(...)`
- `public.vault_add_card_instance_service_v1(...)`
- `public.warehouse_intake_service_v1(...)`

Each service entrypoint requires `auth.role() = 'service_role'`, requires an explicit `p_actor_user_id`, sets the request user claims locally for the underlying legacy function call, and then delegates to the existing privileged implementation.

Direct `anon` and `authenticated` execution is revoked from the original SECURITY DEFINER functions and from the new service entrypoints.

## App Cutover

- Web card interaction execution now authenticates with the normal server component client, then calls `execute_card_interaction_outcome_service_v1` through the server admin client.
- `warehouse-intake-v1` now authenticates the bearer token, then calls `warehouse_intake_service_v1` through a service-role edge client.
- Mobile add/import vault writes now call the new `vault-add-card-instance-v1` edge function.
- `vault-add-card-instance-v1` authenticates the bearer token, validates payload shape, then calls `vault_add_card_instance_service_v1` through a service-role edge client.

## Verification

Pre-apply:

- `pwsh -NoProfile -File .\scripts\migration_preflight_strict.ps1 -Phase PrePush -ExpectedLocalOnlyIds 20260522001500`: passed.
- `npm --prefix apps/web run typecheck`: passed.
- No app or edge code remains calling `execute_card_interaction_outcome_v1`, `vault_add_card_instance_v1`, or `warehouse_intake_v1` directly.

Deployment/apply:

- Deployed `warehouse-intake-v1`.
- Deployed `vault-add-card-instance-v1`.
- `supabase db push --dry-run`: exactly one migration planned, `20260522001500_security_definer_service_entrypoints_v1.sql`.
- `supabase db push --yes`: applied.

Post-apply:

- `supabase db advisors --linked --type security -o json`: no `authenticated_security_definer_function_executable` rows remain.
- `supabase migration list --linked`: ledger aligned; `20260522001500` is present locally and remotely.
- `npm run contracts:test`: passed.
- `npm run contracts:runtime-health`: passed.
- `npm run preflight`: `PASS_WITH_DEFERRED_DEBT`, 0 critical failures.
- `npm --prefix apps/web run typecheck`: passed.
- `npm --prefix apps/web run lint`: passed with the existing `WarehouseSubmissionForm.tsx` `<img>` warning.
- `flutter analyze`: passed.
- `flutter test`: passed.
- `git diff --check`: passed.
- Remaining Security Advisor WARN rows are platform/dashboard settings only:
  - `auth_leaked_password_protection`
  - `vulnerable_postgres_version`
