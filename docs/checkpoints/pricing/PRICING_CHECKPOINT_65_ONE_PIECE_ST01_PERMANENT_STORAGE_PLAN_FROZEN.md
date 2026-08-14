# Pricing Checkpoint 65: One Piece ST-01 Permanent Storage Plan Frozen

## Context

Checkpoint 64 proved that the exact 18 proposed ST-01 card/DON target paths
were absent in Supabase Storage. This checkpoint freezes the separately guarded
permanent-upload code and exact mutation plan without performing Storage or
database access.

## Current Truth

- Frozen producer SHA:
  `eb03b176db42cd468664a94fd767f48584728d5a`
- Branch: `agent/one-piece-ingestion-readiness-v1`
- Exact planned objects: `18`
- Approval fingerprint:
  `902fa50d2377a68634674f10556f97c8692c387ab0b8cc5f164ad96ca5429b5c`
- Storage plan hash:
  `2e4bc3f6588d2d252a63adb93b6a3115fe35f605cbd34312c728936d75b77811`
- Code bundle hash:
  `d4d1c83b938c9bb2017fde64a3fc681eebabbb905fecb07e564f65351fa03bb9`
- Permanent plan artifact SHA-256:
  `1b32e73a35f059955f940d92e40cbc4a0a03774d8e3f9bee46714036e870c7e9`
- Locally reverified source objects: `18 / 18`
- Unique source product IDs, GV-IDs, paths, and hashes: `18 / 18` each
- Sealed assets: `0`
- Storage access/writes during planning: `0 / 0`
- Database connections/writes: `0 / 0`
- Pointer writes: `0`
- Durable objects created: `0`
- Artifact hash mismatches: `0`
- Full One Piece contract suite: `105 / 105` passed

The apply runner was executed without `--apply` and reproduced the approval
fingerprint and plan hash while confirming zero Storage and database access.

## Mutation Contract

The apply runner remains inert unless all three authorization inputs are
present and exact:

1. `--apply`
2. approval fingerprint
   `902fa50d2377a68634674f10556f97c8692c387ab0b8cc5f164ad96ca5429b5c`
3. Storage plan hash
   `2e4bc3f6588d2d252a63adb93b6a3115fe35f605cbd34312c728936d75b77811`

The runner also recomputes the complete code-bundle hash. Any code drift after
plan generation stops execution before Storage access.

## Apply Invariants

- Stage and reverify all 18 exact local images before the first Storage call.
- Perform a fresh 18-object collision check before the first upload.
- Stop before upload if any target exists.
- Use `upsert: false`; never overwrite an existing object.
- Download each new object and reconcile SHA-256, bytes, dimensions, and format.
- Retain all 18 objects only when every upload and readback succeeds.
- On any failure, remove only objects created by that execution and verify each
  removed path absent.
- Never include the three sealed rows.
- Never connect to the database or mutate pointers, canonical identity,
  pricing, publication, or Vault state.

## Artifacts

- Frozen plan directory:
  `docs/audits/pricing/one_piece_st01_storage_permanent_plan_v1/st01_18_objects_v1/`
- Exact plan: `permanent_upload_plan.json`
- Human report: `REPORT.md`
- Audit hashes: `artifact_hashes.json`

## Exact Next Gate

After explicit authorization of the fingerprint and plan hash above, execute
the permanent Storage writer once. Accept only `uploaded_verified_and_retained`
with exactly 18 staged, absent, uploaded, read-back-verified, and durable
objects; zero rollback objects; zero database or pointer writes; and a valid
result proof hash. On any failure, preserve the failure artifact and stop after
verifying execution-owned objects were rolled back.
