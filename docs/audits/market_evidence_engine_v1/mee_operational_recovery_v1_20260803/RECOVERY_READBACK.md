# MEE Operational Recovery V1 Final Readback

## Outcome

The recovery code, additive schema, historical downstream recovery, immutable runtime path, and 50-call live canary are proven. No evidence was deleted and no public pricing boundary changed.

Operational completion is not declared. The timer is disabled because the host has only `100,757,504` bytes of margin above the mandatory 12 GiB provider floor. The 500-call, 4,000-call, and three unattended-cycle gates remain.

## Production Results

Historical August 2 recovery, with zero provider calls:

- `337,429` observations and price events
- `249,624` candidates
- `14,273` strict internal rollups
- `8,500` review-ready
- `5,773` needing more evidence
- zero readback findings

Live 50-call canary:

- `50/50` successful provider requests
- `8,470` persisted observations and price events
- `7,088` candidates
- `435` correctly keyed strict rollups
- `289` review-ready
- `146` needing more evidence
- cursor `0 -> 50`
- one provider attempt, no refetch
- zero final readback findings
- zero public/app-visible/market-truth leakage

## Repaired Failure Classes

- mutable production checkout and in-repository runtime artifacts;
- repeated batch-one acquisition;
- missing provider-attempt and phase resume boundaries;
- unscoped candidate, strict-rollup, and event readback work;
- non-atomic high-volume apply paths;
- session timeout mismatch;
- strict rollup versioning against the wrong run identity;
- readback findings not affecting process status.

## Preserved Exception

The initial canary strict apply created `435` rows under outer-pipeline-key versions. They were not deleted. Every row remains `needs_review=true`, `publishable=false`, `app_visible=false`, and `market_truth=false`. Correctly keyed replacement rows were added from the same plan without another provider call.

## Authority

- Canary-producing code SHA: `4c006483ace43be075a22570008b8107a662438d`
- Production artifact root: `/var/lib/grookai/mee/audits`
- Recovery artifact directory: `/var/lib/grookai/mee/audits/mee_operational_recovery_v1_20260803`
- Key artifact hash manifest SHA-256: `d60c287885acbe31b61f01ff6a624d3905cb2d889c3958596b87f0d3f28d5c17`
- Final schema/security readback SHA-256: `97b8a47151f28fcb26c4ae084e47d075b6631648a4cb6c3d08614ae8673f61c7`
- Final canary reconciliation SHA-256: `1dba97eca29f65ba33ecfcb652a3ee8e1d55c7eabe577dc7b00f38cb40f5b1e4`
- Corrected canary readback SHA-256: `dced9d8aee6e74647c7075be3bde526c3d9cd229e7aa10c3d4f60b62eb5dbabf`

## Next Gate

Expand storage or perform a separately reviewed hash-preserving retention action. Then reinstall the final tracked SHA with the timer disabled and run the 500-call rotating canary from cursor index `50`.
