# Pricing Checkpoint 111: MTG Sealed Storage Canary Failed Safely

## Context

Pricing Checkpoint 110 recorded the successful schema-only production apply.
The next serial gate was an exact 17-object transient Storage canary using the
already audited MTG sealed image coverage.

## Result

The canary from commit `c7c12e457fdc4a4791112c392c93026a53e7bcf9`
stopped during the first source request with `fetch failed`.

- Initial collision checks: `17`
- Completed source fetches: `0`
- Uploads: `0`
- Readbacks: `0`
- Removals: `0`
- Ownership activation: `false`
- Final absence checks: `17`
- Durable objects after run: `0`
- Database connections: `0`
- Signer deployments: `0`

The failure therefore changed no production data or Storage state.

## Decision

Do not reuse the consumed execution authority and do not rerun the failed
operation. Preserve its raw plan, journal, summary, report, and hashes.

Repair only the source transport boundary by adding:

- at most two retries for retryable transport failures per frozen URL;
- an exact maximum of 51 source request attempts;
- stable per-attempt error codes and retryability evidence; and
- tests proving retry ceilings and immediate stop for non-retryable failures.

The repair does not change the selected images, object paths, bucket, byte
contracts, double collision preflight, upload semantics, cleanup scope, final
absence proof, or any forbidden boundary.

## Permanent Evidence

`docs/audits/pricing/mtg_sealed_image_storage_canary_v1/2026-09-04T21-06-46Z_failed_source_transport/`

## Current Truths

- The production sealed image schema remains applied and empty.
- The trusted signer remains undeployed.
- MTG sealed visibility remains hidden.
- No MTG sealed image object was created by the failed canary.
- The original canary authority is consumed.
- A repaired canary requires a new clean execution commit, fingerprint, and
  exact authority.

## Exact Next Gate

Test and commit the bounded transport repair, generate a new 17-object plan from
that exact clean commit, then request a new fingerprint-bound transient Storage
authority. Stop before Storage until that authority is received.
