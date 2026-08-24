# Production Backend Launch V1 Read-Load Gate

**Observed:** `2026-08-24T17:49:06.879Z`

**Branch:** `release/production-backend-launch-v1`

**Frozen load commit:** `646f8dac17e4c8dcc340045a1d7dda536b598556`

**Result:** **PASSED**

## Scope

This gate exercised production search, governed pricing reads, and canonical
image delivery. It was read-only: no database, Storage, canonical, Vault,
pricing-publication, or user-data writes were authorized or performed.

The target was `33 RPS` for five minutes. The measured expected peak was
`16.05 RPS`, so the test represented `2.056x` expected launch traffic.

## Search Repair

The original search RPC expanded and scored the full parent/child search
document population. Under concurrent traffic it exceeded the search SLO and
produced statement timeouts.

Three additive, immutable migrations repaired the read path:

1. `20260824170000_print_identity_search_candidate_first_v1.sql`
2. `20260824173000_catalog_parent_visibility_direct_v1.sql`
3. `20260824174500_print_identity_search_bounded_candidates_v1.sql`

The final migration was applied from commit `e518b453537d127575e0f88fa44df835044df8e9`
with SHA-256
`9bd4785a329008737fd5cb8e5755542733bda3a4ed5e59ffda360f9b813c05bc`.

Before apply, a session-only candidate function preserved exact ordered output
for five high-volume names and nine extended identity, set, number, finish,
cameo, object-type, and pagination cases. The apply changed one function and
one migration-ledger row. Canonical, printing, and release-control counts did
not change; anonymous, authenticated, and service-role execute grants remained
present.

## Rate-Limit Model

The first 15 RPS test intentionally exposed the production API lane's
single-actor limit: the image path returned governed HTTP `429` responses after
more than `120` requests from one actor in a minute. The app protection limit
was not changed.

The launch test modeled ten independent collectors with stable, recorded user
agents. One bounded retry was permitted only for transport connect/socket
failures. HTTP errors were never retried. A retry rate above one percent or any
unrecovered request would fail the gate. The passing run used zero retries.

## Final Result

| Measure | Result | Target |
| --- | ---: | ---: |
| Planned/completed requests | `9,900 / 9,900` | exact reconciliation |
| Successful requests | `9,900` | all |
| HTTP failures | `0` | `<1%` user-visible |
| HTTP 429 responses | `0` | `0` distributed launch load |
| Transport retries | `0` | `<=1%` |
| Search p95 | `225.245 ms` | `<800 ms` |
| Pricing detail p95 | `178.888 ms` | `<400 ms` |
| Pricing grid p95 | `143.057 ms` | `<400 ms` |
| Image p95 | `248.269 ms` | `<2,000 ms` |
| Image maximum | `1,495.742 ms` | `<2,000 ms` |
| Maximum DB connections | `33.33%` | `<70%` |
| Waiting locks | `0` | `0` |

Request mix:

- search: `3,960`
- pricing detail: `2,475`
- pricing grid: `1,485`
- image HEAD: `1,980`

## Preserved Failed Evidence

- The first 33 RPS run exposed the original search statement-timeout failure.
- The single-actor canary proved the production API throttle returns governed
  `429` responses rather than silently failing.
- A complete 33 RPS run recorded ten local `UND_ERR_CONNECT_TIMEOUT` failures
  in one early burst and then more than 9,300 healthy requests. The bounded
  reconnect policy was added without hiding HTTP failures. The final run used
  no retry and passed all 9,900 requests.

No failed artifact was deleted or relabeled as passing evidence.

## Permanent Evidence

- Bounded preflight:
  `C:\secure-ops\production-backend-launch\search-migration\2026-08-24T17-27-46-860Z_bounded_preflight\`
- Extended equivalence:
  `C:\secure-ops\production-backend-launch\search-migration\2026-08-24T17-28-31-542Z_bounded_extended_equivalence\`
- Guarded apply:
  `C:\secure-ops\production-backend-launch\search-migration\2026-08-24T17-30-53-569Z_bounded_apply\`
- Passing distributed canary:
  `C:\secure-ops\production-backend-launch\read-load\20260824T173421Z_distributed_canary_15rps_60s\`
- Passing final launch gate:
  `C:\secure-ops\production-backend-launch\read-load\20260824T174405Z_final_launch_33rps_300s\`

Final artifact hashes:

- `run_plan.json`: `6acd38e452b02f16aabb5b41f50f4def7978fe110fb7c63e8b70ba1fb566bb74`
- `summary.json`: `d8228a1105d601238d5754095c8a4858111ee941fda6f854da42609c9655a200`
- `REPORT.md`: `22a9fdc0c0d0e6c2be4f7ff291f6352a18e8fc8bdcc72eeaa2e8487ddccf0625`
- `db_snapshots.jsonl.gz`: `84f0bb75eab7d5faa636a6ba1725ad84e4164d6225341351c39236da7fe39611`
- `measurements.jsonl.gz`: `1b65704a9c99350169817676364d8703d393fb760990fb361503934f7de0fc5d`

## Decision

The read-load gate is closed. It does not clear the separately blocked managed
disk capacity, Storage-plan/egress, nonproduction restore, same-candidate
client, 72-hour canary, or final rollback/report gates. Launch remains
**NOT READY**.
