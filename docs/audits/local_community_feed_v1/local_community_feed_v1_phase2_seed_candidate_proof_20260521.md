# LOCAL_COMMUNITY_FEED_V1 Phase 2 Seed + Candidate Proof

Date: 2026-05-21  
Status: INTERNAL_PROOF_COMPLETE

## Scope

This phase verified the applied local community feed infrastructure with explicit founder-approved test collectors.

No UI was built.

## Test Collectors

Resolved public + vault-sharing profiles:

| Slug | Display | User id |
| --- | --- | --- |
| `imnotcesar` | `imnotcesar` | `03e80d15-a2bb-4d3c-abd1-2de03e55787b` |
| `pokejavi` | `Poke Javi` | `c177a180-e36b-44cc-93f8-ee104717a389` |

## Local Opt-In Seed

Both test collectors were explicitly opted into coarse local discovery.

Seed values:

```text
area_label = Founder Test Area
region_code = CO
country_code = US
geohash_prefix = 9xj
radius_miles = 25
location_precision = coarse
location_source = manual
```

No exact latitude or longitude was written.

## Baseline Candidate Dry Run

Command:

```powershell
node scripts/audits/local_community_feed_v1_candidate_dry_run.mjs --viewer-slug=imnotcesar --label=baseline
```

Result:

- viewer: `imnotcesar`
- local settings: `2`
- wall rows inspected: `26`
- stream rows inspected: `23`
- candidate count: `4`
- nearby owner: `pokejavi`
- locality label: `Founder Test Area`
- distance bucket: `nearby`
- raw user IDs exposed in candidates: `false`
- precise location exposed: `false`

Candidate examples:

- `GV-PK-OBF-228` Charizard ex
- `GV-PK-PFL-098` Piplup

## Mute Exclusion Proof

Temporary write:

```text
imnotcesar muted pokejavi
```

Candidate dry run:

```powershell
node scripts/audits/local_community_feed_v1_candidate_dry_run.mjs --viewer-slug=imnotcesar --label=muted
```

Result:

- candidate count dropped from `4` to `0`
- exclusion reason included muted rows

Cleanup:

- temporary mute row deleted

## Block Exclusion Proof

Temporary write:

```text
pokejavi blocked imnotcesar
```

Helper verification:

```text
local_community_collectors_are_blocked_v1(imnotcesar, pokejavi) = true
```

Candidate dry run:

```powershell
node scripts/audits/local_community_feed_v1_candidate_dry_run.mjs --viewer-slug=imnotcesar --label=blocked
```

Result:

- candidate count dropped from `4` to `0`
- block exclusion worked even when block direction was owner-to-viewer

Cleanup:

- temporary block row deleted

## Post-Cleanup Verification

Candidate dry run:

```powershell
node scripts/audits/local_community_feed_v1_candidate_dry_run.mjs --viewer-slug=imnotcesar --label=post_cleanup
```

Result:

- candidate count returned to `4`
- remaining temporary mutes: `0`
- remaining temporary blocks between test accounts: `0`

## Artifacts

- `local_community_feed_v1_candidate_dry_run_20260521_baseline.json`
- `local_community_feed_v1_candidate_dry_run_20260521_muted.json`
- `local_community_feed_v1_candidate_dry_run_20260521_blocked.json`
- `local_community_feed_v1_candidate_dry_run_20260521_post_cleanup.json`
- `local_community_feed_v1_seed_test_20260521.json`

## Remaining Before UI

Before internal UI starts, the next backend step should be a real read-model/RPC migration draft that turns the dry-run worker contract into a database-backed authenticated RPC.

## Confirmation

- Local opt-in writes were limited to two explicit test collectors.
- Temporary block/mute writes were cleaned up.
- No exact coordinates were written.
- No UI changes.
- No global public view changes.
- No scanner changes.
- No pricing changes.
- No Species Dex changes.
- No card identity changes.
