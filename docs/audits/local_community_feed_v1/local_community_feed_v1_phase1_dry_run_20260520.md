# LOCAL_COMMUNITY_FEED_V1 Phase 1 Dry Run

Generated: 2026-05-21T12:12:22.575Z

## Status

NO_WRITE_DRY_RUN. The local community feed is not eligible to return rows until the opt-in infrastructure is applied and populated.

## Future Table Presence

Future object presence is verified by the apply-gate SQL precheck, not by Supabase REST dry-run probes.

Expected pending objects:

- `collector_local_discovery_settings`
- `collector_local_blocks`
- `collector_local_mutes`
- `local_community_collectors_are_blocked_v1`

## Source Counts

| Source | Count |
| --- | ---: |
| `public_profiles` | 26 |
| `public_profiles_enabled` | 26 |
| `public_profiles_vault_sharing` | 26 |
| `v_wall_cards_v1` | 26 |
| `v_card_stream_v1` | 23 |
| `collector_follows` | 5 |
| `card_feed_events` | 214 |

## Projection Safety

No forbidden precise-location fields were found in sampled `v_wall_cards_v1` or `v_card_stream_v1` rows.

## Dry-Run Result

- Eligible local collectors: 0
- Eligible feed rows: 0
- Blocked reason: Phase 1 migration is draft-only/not populated; no collector can be local-feed eligible yet.
- Anonymous local feed allowed: false
- Existing global public views modified: false

## No-Write Confirmation

- No DB writes.
- No migrations applied.
- No UI integration.
- No scanner changes.
- No pricing changes.
- No Species Dex changes.
- No identity changes.
