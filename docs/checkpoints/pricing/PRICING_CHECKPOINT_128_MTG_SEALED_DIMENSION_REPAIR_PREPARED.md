# Pricing Checkpoint 128: MTG Sealed Dimension Repair Prepared

## Context

The signed-in MTG sealed client pull request passed local and CI validation.
Final review identified that the applied image-evidence dimension check could
accept a partially null tuple because PostgreSQL treats a `NULL` check result
as passing.

## Decision

Keep the applied migration immutable and add forward-only migration
`20260905120000_mtg_sealed_image_dimension_constraint_repair_v1.sql`. The new
constraint explicitly requires all three dimension fields to be absent or all
three to be present and positive.

## Current Truths

- The repair is schema-only and contains no application-data mutation.
- Focused MTG sealed schema tests pass `32/32`.
- The migration SHA-256 is
  `d98f08ba73afcac510b1ae052ac35b0747c34816018900c6dba006f497f3f30e`.
- Supabase was relinked to the canonical project over IPv4.
- Strict preflight reached `supabase db diff --linked` but did not complete
  within the bounded operator window.
- The repair is therefore prepared but not authorized or applied.

## Invariants

- Do not rewrite migration `20260904130000`.
- Do not apply the repair without a clean strict ledger preflight, local replay,
  exact migration hash, and explicit production apply authority.
- Do not couple this constraint repair to client visibility, release pointers,
  pricing, Storage, Vault, or cross-game changes.

## Exact Next Gate

Complete strict linked-ledger preflight and local replay for the forward
migration. If both pass, freeze an exact schema-only apply plan and request the
single bounded production migration authority. Production client rollout may
continue independently because clients only read already validated active
release rows and cannot insert image evidence.
