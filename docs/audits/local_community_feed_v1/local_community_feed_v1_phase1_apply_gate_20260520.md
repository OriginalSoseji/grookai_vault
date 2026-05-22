# LOCAL_COMMUNITY_FEED_V1 Phase 1 Apply Gate

Date: 2026-05-20  
Status: DRAFT_ONLY_NOT_APPLIED

## Scope

Phase 1 introduces isolated local community infrastructure only:

- `collector_local_discovery_settings`
- `collector_local_blocks`
- `collector_local_mutes`
- `local_community_collectors_are_blocked_v1(...)`

This does not create the feed RPC, does not wire UI, and does not modify global public views.

## Migration

Draft migration:

```text
supabase/migrations/20260520233000_local_community_feed_infra_v1.sql
```

## Safety Properties

- Additive tables only.
- No writes to existing tables.
- No changes to `public_profiles`.
- No changes to `shared_cards`.
- No changes to `v_wall_cards_v1`.
- No changes to `v_card_stream_v1`.
- No exact latitude/longitude columns.
- No anonymous grants on local discovery settings, blocks, or mutes.
- RLS limits direct table access to the owning authenticated user.
- Block helper is available only to authenticated users.

## Pre-Apply Plan

Before applying this migration:

1. Confirm migration ledger has only this expected local-only migration.
2. Run strict migration preflight with expected local-only id:

```powershell
pwsh -NoProfile -File .\scripts\migration_preflight_strict.ps1 -Phase PrePush -ExpectedLocalOnlyIds 20260520233000
```

3. Run local replay:

```powershell
supabase db reset --local
```

4. Run dry-run audit:

```powershell
node scripts/audits/local_community_feed_v1_dry_run.mjs
```

5. Confirm no global public view projection includes precise location fields.

### 2026-05-20 Strict Gate Result

The strict migration preflight was run with:

```powershell
pwsh -NoProfile -File .\scripts\migration_preflight_strict.ps1 -Phase PrePush -ExpectedLocalOnlyIds 20260520233000
```

Result:

- expected pending set matched
- duplicate pending objects were not found
- local replay/reset passed
- migration was applied only to the local reset database during replay
- no linked/remote migration apply was performed

## Remote Read-Only Precheck

Before apply, verify the target objects do not already exist remotely:

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'collector_local_discovery_settings',
    'collector_local_blocks',
    'collector_local_mutes'
  );

select routine_name
from information_schema.routines
where routine_schema = 'public'
  and routine_name = 'local_community_collectors_are_blocked_v1';
```

Expected:

- no rows for target tables
- no existing helper function

If partial objects exist, stop and audit drift. Do not use migration repair.

### 2026-05-20 Result

Remote read-only SQL precheck was run against the linked project.

Result:

- target tables absent
- target helper function absent
- no partial local community feed objects detected
- ledger shows `20260520233000` as the only local-only migration

## Post-Apply Verification Plan

If this migration is later applied, verify:

- tables exist
- RLS is enabled on all three tables
- anon has no grants
- authenticated has only intended grants
- owner policies exist
- block helper exists
- helper returns true when either direction is blocked
- no existing public views changed
- no local feed rows become available until opt-in settings are populated

## Rollback Plan

If applied and rollback is required before any user data is written:

```sql
drop function if exists public.local_community_collectors_are_blocked_v1(uuid, uuid);
drop table if exists public.collector_local_mutes;
drop table if exists public.collector_local_blocks;
drop table if exists public.collector_local_discovery_settings;
```

If user data exists, do not drop tables without a data export and founder approval.

## Stop Conditions

Stop if:

- migration ledger has unexpected drift
- local replay fails
- migration adds exact coordinate fields
- migration grants anon access to local discovery tables
- migration modifies existing global public views
- dry-run finds precise location projection in wall/network samples

## No-Write Confirmation

- Migration drafted only.
- Migration not applied.
- No linked/remote DB writes.
- No UI integration.
- No scanner changes.
- No pricing changes.
- No Species Dex changes.
- No identity changes.
