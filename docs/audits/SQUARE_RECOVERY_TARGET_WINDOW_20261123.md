# Square recovery target-window qualification — November 23, 2026

Status: the first candidate failed an additional actual-RPC starvation case
after its initial selection, application and two isolated clone upgrades
passed. The separate forward correction passed the local qualification below. Both candidates
remain disabled in production and unqualified for production publication. Exact-head source
and hosted-check status belongs to the checkpoint and pull request.

The owner selected 100 vendors with 1,000 cards each. The earlier audit proved
that the old 1,000-row read can omit a sold mapping before application selection.
This candidate reserves that mapping inside the bounded automatic read while
retaining the existing two/five-item provider work limit and fenced writers.

| Check | Observed result |
| --- | --- |
| Fresh canonical519 starting audit | Passed: eight schema comparisons, 2,629 exact security objects, zero diagnostic differences and no database writes. |
| First actual PostgreSQL selection test | Failed: `to_jsonb(selected)` resolved the boolean column rather than the complete row. Two empty-result cases passed before the first populated case failed. The failure remains preserved. |
| Corrected PostgreSQL selection | Passed all20 read-only cases, including zero/live/sold-only inventory, 999/1,000/1,500/100,000 active targets, sold rotation, pending work and foreign-connection exclusions. |
| Square backend and website routes | Passed127 tests with no skips on the qualified Windows Node22.23.5 runtime. |
| Integrated pricing candidate | Passed30 pricing backend/website-route tests. This is separate from full integration qualification. |
| Full managed source checks | Required at each final source head and recorded separately in source-bound hook/hosted receipts. Earlier integration disk/Docker failures remain preserved; no normal hook was bypassed. |
| Actual clone upgrade/no-op | Passed for separate fresh-lineage and populated-retained clones. Official CLI upgrade/no-op reached520; all449 protected tables retained identical data. Only the intended function definition changed; all other security metadata remained exact. |
| Complete clone schema/security comparison | Passed: zero differences across all four governed schemas and exact equality of2,629 security objects. Generated diagnostic SQL was not executed. |
| Actual RPC at the requested inventory size | Passed with100 synthetic owners,100,000 active copies and300 retained sold-state fixtures.100 default reads reproduced the old boundary;200 bounded reads reached the oldest sold mapping and retained pending priority. |
| Actual role/owner/lease/concurrency guards | Passed SQL-role denial for anonymous/authenticated callers, foreign owner, wrong token, stale fence, pending-first focused reads, three-copy sold rotation and competing row-lock enforcement.11 further edge cases passed, including expired/missing leases and unsupported bounds; the fixture lease was restored. |
| Exact frozen-SQL idempotence | Passed: executing the identical candidate SQL again on the owned retained clone left all449 table fingerprints,2,629 security objects and the migration ledger unchanged. |
| Additional sold-pending counterexample | Failed first-candidate qualification: a saved catalog request on one sold copy and an older second sold copy filled both slots, excluding live work. The original result and rolled-back fixture are retained. |

## Forward correction after the sold-pending failure

`20261123004000_square_recovery_target_lanes_v2.sql` replaces the automatic
branch with separate live and sold lanes. It pins the entire first-candidate
definition; the locally applied `20261123003000` bytes stay unchanged. Live
work retains its existing priorities and at least one slot when present;
oldest sold mappings fill the reserved/remainder slots without exceeding the
existing two/five-target bound. Sold-only inventory still fills the batch.
No catalog attempt is deleted, no sold copy receives stock, and no write,
authentication, lease, grant or RLS authority changes.

The counterexample is retained in `stock-sold-pending-counterexample-v1` under
the same private artifact parent. Its temporary synthetic fixture was fully
rolled back. `scripts/schema/verify_square_recovery_selection_v2.mjs` preserves
36 read-only selection cases, including sold pending requests, queued sold
changes, live transitions, null allocation and sold-only capacity. Existing
V1 proofs remain historical; they do not qualify V2 or excuse fresh replay.

The V2 follow-up passed all36 read-only cases and the original actual-RPC
counterexample: the two-slot result is now one active and one sold copy. That
temporary fixture was rolled back. Official CLI dry-run, upgrade and no-op
passed on both owned clones at521 with all449 table fingerprints unchanged;
only the expected function definition changed. Complete four-schema and2,629
security-object comparison and exact-SQL idempotence passed again.

The existing100-owner fixture was reused, without reseeding or disabling
guards. After checking each synthetic connection's identity/token/fence, only
those100 local fixture leases were re-armed. Actual RPC checks passed again:
100 legacy reads,200 bounded reads, role/owner/token/fence denials, focused
compatibility, sold rotation and the competing row lock. All11 further guard
edges passed and the expiry-test lease was restored. Selection median was
11.07ms, p9513.23ms and maximum20.62ms; these are local samples only.

The V2 receipts are `stock-lanes-selection-v1`, `stock-lanes-upgrade-v1`,
`stock-sold-pending-corrected-v2`, `stock-lanes-actual-rpc-v1`,
`stock-lanes-guard-edges-v1`, `stock-lanes-schema-v1` and
`stock-lanes-sql-idempotence-v1` beneath the private artifact parent. Raw V2
migration SHA256 is
`117356aca4172d110d71f50add63e5d7e38c5d81aafa7b663cf7b5560235b64b`;
its full resulting function definition hashes to
`5ef48123825c07a02784b76a14d01c0b4b40fb51f8e6caabfb6619da9e8bae75`.
Both locally applied SQL files are immutable. A further repair requires another
forward migration. No new empty521 reset, HTTP Auth session, independent
merchant or actual provider throughput is claimed by these receipts.

## Fresh replay, HTTP Auth and clock wiring follow-up

A separate new owned lab completed the genuine clean-prefix reset and official
CLI push/no-op of all521 unchanged migration files. The first history attempt
stopped at the existing Best of Game evidence guard. Its retained correction
adds only100 catalog INSERT statements from the frozen historical fixture
`1e066c071592d9b43817cd2bcebdf5158b73d6f2f9598662de36c13bb15b665d`;
all six owner-fixture statements are omitted. With the existing explicit647-pair
prerequisite, final replay has1,316 catalog parents and656 aliases, zero copied
owner rows and no disabled guard. The larger retained clone's1,349 parents
include extra regression fixtures; equal row counts are not claimed.

Complete four-schema and2,629-object security comparison passed against the
retained521 clone. Two new real local Auth sessions then passed11 SDK/PostgREST
checks: isolated owner workspaces, anonymous/owner denial of the privileged
RPC, foreign-owner/stale-fence/wrong-lease denial for the service caller and
bounded live/sold results for both owners. The earlier fixture-only42P10 error
remains failed evidence; its two Auth accounts were retained, never reset.
These are actual local authentication-boundary tests, not independent seller
OAuth, a production sign-in session or a provider load test.

The official CLI experimental `db pull --local` export passed using the exact
owned relay's network namespace. Before/after fingerprints of481 tables,
security and the migration ledger stayed equal. All1,869 generated SQL files
remain private diagnostics and were never executed. The first Windows/Docker
loopback failure and failed extra-relay probe remain preserved. The supported
export mode is distinct from ordinary historical shadow-diff qualification;
the exact production release gate is still outstanding.

These receipts are under `stock-lanes-fresh521-v2`,
`stock-lanes-http-auth-v2`, `stock-lanes-fresh-schema-v1` and
`stock-lanes-official-pull-v2` beneath the private artifact parent.

Final source review also found that the GitHub scheduler's private-environment
allowlist omitted the new opt-in flag. The follow-up adds its default-false
workflow binding and strict optional serialization, without enabling either
hosted clock.18 focused tests passed across window admission, cloud propagation
and the actual adapter. The adapter tests intercept only child-process creation,
inspect the real private environment file, prove worker configuration receives
the flag and verify malformed/injected values never launch a worker.

The normal20e4ed41 commit passed8,943 contracts,127 Square tests, web checks,
Flutter analysis and2,100 app tests with two existing skips. Its pre-push run
was intentionally interrupted for the clock-wiring correction. The source-bound
checkpoint records the new final-head commit/push checks; the earlier pass
must not qualify the changed tree. No old SQL bytes changed in this follow-up.

The populated-query regression was corrected before any local or production
application of the new migration. The full proposed function definition now
hashes to `a12df583b9c6163cd7be81183ae91956fd92b8264aa98233c46d24f9ba1bc3a2`.
Migration bytes hash to
`c60f33c0637a0b95e01d0a8c0356a616f8a2082035d8887bd72ec6f3571c27a2`.
The original failed query and interrupted runs have not been relabeled as passes.
Both local applications are now part of immutable SQL history. Any further SQL
repair requires a new forward migration. The retained source databases were
not reset or written. The clone upgrades inherit their qualified prefix replay
lineage; no new empty520 reset has been claimed.

The local upgrade evidence is retained under
`C:/grookai_vault_operator_artifacts/square_launch_readiness_20261122/hardening-v1/stock-window-upgrade-v8`.
Earlier connection/settings failures remain preserved separately. Clone database
settings were copied with the existing local administrator role; no role or
parameter permission was granted or widened. The explicit non-TLS setting is
confined to the fixed loopback fixture connection. Production inspection retains
its verified-TLS requirements.

The actual RPC and edge receipts are under `stock-window-actual-rpc-v3` and
`stock-window-guard-edges-v1` beneath the same private artifact parent. No guards
were disabled while creating the100,300-copy fixture. These owners and connected
merchant records are synthetic local state. SQL `SET LOCAL ROLE` checks are not
actual HTTP Auth sessions, independent merchant OAuth or provider requests.
The200 bounded reads had a local observed median11.25ms, p9513.60ms and maximum
19.06ms. This is a selection sample on the local fixture, not a provider
throughput guarantee or an approved production SLO.

## Reproduce the focused checks

With the repository's qualified dependencies/runtime installed:

```powershell
$env:VIPS_CONCURRENCY='1'
node --test --test-concurrency=1 backend/square/tests/*.test.mjs apps/web/src/lib/square/*Route.test.mjs
```

The checked-in read-only SQL verifier extracts the exact byte-pinned candidate
expression and evaluates it in the sealed local PostgreSQL image against
generated relations. It validates the unchanged row fields, unique identities,
batch bounds, oldest sold mapping, foreign exclusion and retained pending-work
priority. On this operator workspace, choose a new output version; existing
evidence directories are never overwritten:

```powershell
node scripts/schema/verify_square_recovery_selection_v1.mjs v4
node scripts/schema/verify_square_recovery_selection_v2.mjs v2
```

The original successful producer and complete20-case receipt are retained under
`C:/grookai_vault_operator_artifacts/square_launch_readiness_20261122/hardening-v1/stock-window-selection-v3`.
The fixed output parent, migration hash, existing local container/image and
isolation checks reject arbitrary database, SQL, environment or output targets.
This is a local selection experiment. It is not actual service RPC/Auth,
indexed-database load, provider throughput, fresh reset or production acceptance.

## Outstanding release work

Require formal candidate migration/release qualification, independent merchant
acceptance and measured provider/clock capacity, current-source normal
commit/push and hosted/review checks, exact production PrePush and
independent deployment/readback. The main merge pause remains binding.

`GROOKAI_SQUARE_RECOVERY_WINDOW_ENABLED` remains off. No production migration,
price, inventory, payment, printer or Samsung installation was changed in this
qualification step. Existing working small-account behavior remains live.
