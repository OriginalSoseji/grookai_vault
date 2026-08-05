# Pricing Canary Commit-Pin Repair and Restart

## Result

The special-variant review project is complete. Pricing Production V1 is now
back in a valid, read-only 72-hour observation window after a scheduler
configuration incident invalidated the preceding window.

This report does not declare the replacement canary passed. The replacement
window began at `2026-08-05T07:51:54.064Z` and cannot pass before
`2026-08-08T07:51:54.064Z`, plus the configured final-slot completion grace.

## Frozen Runtime

| Field | Value |
| --- | --- |
| Producing commit | `6b729441bf8944048885ade5d9905e23166d9d46` |
| Runtime branch | `pricing/mee-productization-v1` |
| Canary | `TCGPLAYER_MARKET_CANARY_100_V2` |
| Canary SHA-256 | `861b9dd97baaa0c93a6bcdd94c5f9ef903388bbc87a31923cfee3fbeb8cfc3d2` |
| Scheduled time | `08:15 UTC` daily |
| Expected rows | `100` |
| Allowed source-missing ceiling | `5` |
| Canonical identity writes | denied |
| Vault writes | denied |
| Modeled-value writes | denied |

## Invalidated Window

The preceding window started at `2026-08-02T22:29:17.856Z`. Its observer
failed at `2026-08-05T06:09:49.658Z` with:

- two missing scheduled slots (`2026-08-03` and `2026-08-04`)
- two terminal operations alerts
- zero governed current exact prices
- source evidence approximately 56 hours old
- zero rows through the authenticated shared read model

The production checkout was already at the reviewed commit `6b729...`, but
the systemd environment still required historical commit `08bfdd...`. Both
scheduled services failed closed before provider or pricing work because the
runtime commit did not match the configured expected commit.

This was a scheduler configuration incident, not a canonical-data loss or a
provider-data failure. The failed observer and its full evidence are preserved
under `original_window_failure/`.

## Repair

The repair was deliberately limited to runtime configuration:

1. Preserve the original systemd environment file as a timestamped backup.
2. Disable the timer while changing the expected commit pin.
3. Set the expected commit to the already deployed reviewed commit
   `6b729...`.
4. Run the exact immutable 100-row canary once with a unique recovery key.
5. Remove the one-time run-key override.
6. Re-enable the daily timer.

No migration, canonical identity mutation, Vault mutation, modeled-value
write, or canary substitution occurred.

## Recovery Publication

| Field | Value |
| --- | --- |
| Recovery key | `TCGPLAYER-MARKET-SCHEDULE-CANARY-2026-08-05-REPAIR1` |
| Started | `2026-08-05T06:25:08.785Z` |
| Finished | `2026-08-05T08:02:50.677Z` |
| Attempts / retries | `1 / 0` |
| Source run ID | `1e8e1aae-9272-42ad-91f9-f781d161184a` |
| Publication run ID | `3c1be9e1-de61-4459-9110-890fd7cc9210` |
| Publication set ID | `168e8206-4926-41a1-9e78-d997273bdb08` |
| Source requests | `9,215` |
| Source products | `498,878` |
| Source price rows | `542,019` |
| Source failures | `0` |
| Selected / eligible / snapshots | `99 / 99 / 99` |
| Required phases succeeded | `5 / 5` |
| Broken traces | `0` |
| Health | `healthy` |

Exactly one canary identity was unavailable from the current exact source:
`GV-PK-SM-SM128-HOLO` expected `tcgplayer:168245:holofoil`, while the current
source exposed only `tcgplayer:168245:normal`. The policy preserved the exact
printing boundary and did not substitute the normal printing. The resulting
`99` current rows are within the reviewed source-missing ceiling of `5`.

## Initial Replacement Observation

At `2026-08-05T08:05:12.985Z` the read-only observer reported:

- status `observing`
- `99` current exact and positive-USD rows
- `99` authenticated shared-read-model rows
- `0` stale rows
- `0` missing provenance rows
- `0` broken traces
- anonymous execution denied with PostgreSQL code `42501`
- rollback authority available
- no findings

The full observer payload is under `replacement_window_initial_observation/`.

## Unattended Proof

The first replacement-window timer fired at `2026-08-05T08:15:09Z`. Its
frozen plan proves the expected commit, clean tracked worktree, exact canary
hash, 100-row definition, and unchanged write boundaries.

The unattended run completed at `2026-08-05T08:36:26.696Z`:

- final classification `success`
- one attempt and zero retries
- source continuity `skipped_no_change` / `verified_no_change`
- publication run `835ddaf5-cbc0-44cc-861f-7330aca3282d`
- selected / eligible / snapshots `99 / 99 / 99`
- one explicit source-missing identity
- health `healthy`

The observer matched the scheduled slot at a source-start offset of `0.191`
minutes. It found no missing, pending, unhealthy, unmatched, or duplicate
source/publication slots; no terminal alerts; `99` authenticated governed
reads; denied anonymous access; available rollback; and no findings.

## Incidental MEE Runtime Repair

While the pricing recovery waited on the shared host, the MEE nightly worker
exposed an `ETXTBSY` failure caused by rewriting the same executing Supabase
shim path. The worker now uses a content-addressed immutable shim directory.

- repair commit: `4747d540dd1ebbe833585be2f1fc1fb562144086`
- targeted tests: `20 / 20`
- deployed release: `/opt/grookai/releases/mee/4747d540d`
- next unattended MEE cycle: `2026-08-06T03:23:13Z`

This repair did not mutate pricing data and remains independently verifiable
at its next scheduled cycle.

## Decision

The observer workflow is re-anchored to the replacement activation while its
execution source remains pinned to `6b729...`. This metadata update does not
change the producing runtime.

The pricing canary remains `observing`. Post-canary migration, broader
publication, client rollout, and public visibility remain unauthorized.

## Exact Next Gate

Observe and reconcile the scheduled `08:15 UTC` cycles on August 5, 6, and 7.
After the window end and completion grace, run the observer with
`--require-pass`. Only a terminal pass with no missing or unhealthy slots,
healthy current evidence, governed authenticated reads, denied anonymous
access, and available rollback may authorize the frozen post-canary sequence.
