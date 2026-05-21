# LOCAL_COMMUNITY_FEED_V1 Phase 1 Post-Apply Verification

Date: 2026-05-21  
Status: APPLIED_AND_PARTIALLY_VERIFIED

## Apply Result

Applied migration:

```text
20260520233000_local_community_feed_infra_v1.sql
```

Command:

```powershell
supabase db push --yes
```

Supabase applied exactly one migration:

```text
20260520233000_local_community_feed_infra_v1.sql
```

No migration repair and no `--include-all` were used.

## Object Verification

Remote read-only SQL confirmed these tables exist:

- `collector_local_blocks`
- `collector_local_discovery_settings`
- `collector_local_mutes`

Remote read-only SQL confirmed helper exists:

- `local_community_collectors_are_blocked_v1`

## Schema Verification

`collector_local_discovery_settings` contains only coarse locality fields:

- `area_label`
- `region_code`
- `country_code`
- `geohash_prefix`
- `radius_miles`
- `location_precision`
- `location_source`

No exact coordinate columns were added.

## RLS And Grant Verification

Remote read-only SQL confirmed RLS is enabled on:

- `collector_local_blocks`
- `collector_local_discovery_settings`
- `collector_local_mutes`

Remote grants confirmed:

- no `anon` table grants
- `authenticated` receives intended owner-scoped grants
- owner policies exist for select/insert/update/delete where intended

## Ledger Note

`supabase migration list --linked` hit a CLI direct-DB auth failure after apply:

```text
password authentication failed for user "cli_login_postgres"
```

This did not block schema verification because linked SQL checks succeeded through `supabase db query --linked`, and `supabase db push --yes` reported the exact migration apply.

Fallback linked SQL verification confirmed:

```text
supabase_migrations.schema_migrations.version = 20260520233000
name = local_community_feed_infra_v1
```

Follow-up: rerun `supabase migration list --linked` after CLI DB password state is refreshed.

## Dry Run

The dry-run audit was rerun after migration apply.

Result:

- eligible local collectors: `0`
- eligible feed rows: `0`
- forbidden precise-location projection fields: `[]`
- anonymous local feed allowed: `false`

This is expected until a specific collector opt-in row is seeded.

## Seed Test Status

No collector was seeded automatically.

Reason:

Local discovery is an explicit privacy opt-in. A seed script was created, but it refuses to choose a collector automatically. It requires one of:

```powershell
node scripts/audits/local_community_feed_v1_seed_test_collector.mjs --slug=<public-profile-slug> --apply
node scripts/audits/local_community_feed_v1_seed_test_collector.mjs --user-id=<uuid> --apply
```

Optional coarse locality arguments:

```powershell
--area-label="Denver area" --region-code=CO --country-code=US --geohash-prefix=9xj --radius-miles=25
```

## No-Drift Confirmation

- No global public views changed.
- No UI integration.
- No scanner changes.
- No pricing changes.
- No Species Dex changes.
- No card identity changes.
- No public route changes.
