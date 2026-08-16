# MTG Canonical Catalog Canary Production Preflight

- Status: **READY_FOR_SERVICE_ONLY_STAGE_APPLY_APPROVAL**
- Payload fingerprint: `83d491f692c6544ad7602e06dc6acce4c6cfc2895aabb9aabcf93735ed1d2ad7`
- Staging migration SHA-256: `20d449155373d423a4ea0feb5ba7d0a604270aedf1211c064776edf78f5301b8`
- Foundation migration SHA-256: `d4085f0dab4c9d5724dcda5644b1774ab48bb3535f94b42f0ca3cea1786de082`
- Transaction read-only: `true`
- Database writes: `0`

## Production Source Readback

- Planned exact lanes: `807`
- Current source rows found: `807`
- Positive marketPrice rows: `807`
- Observed on: `Thu Aug 13 2026 00:00:00 GMT-0600 (Mountain Daylight Time)`

## Collision Readback

- staging_payloads: `0`
- set_ids: `0`
- set_codes: `0`
- card_print_ids: `0`
- parent_gv_ids: `0`
- identity_hashes: `0`
- printing_ids: `0`
- printing_gv_ids: `0`
- parent_external_mappings: `0`
- printing_external_mappings: `0`

## Decision

The service-only staging migration and frozen one-set payload are collision-free. Canonical promotion remains a separate blocked gate because shared canonical rows can become app-visible.
