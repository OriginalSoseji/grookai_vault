# FULL_DB_AUDIT_V1 Scope And Connection

- Audit timestamp: 2026-04-03T06:14:13.117Z
- Target DB connection surface: remote PostgreSQL via `SUPABASE_DB_URL`
- Comparison surface: local Supabase DB via `supabase status -o env` (available)
- Audit mode: read-only
- Writes performed: none
- Scope:
  - schema inventory
  - table counts
  - constraints and indexes
  - canonical parent surfaces
  - identity subsystem
  - null-parent and missing-number surfaces
  - provenance-bearing surfaces
  - Battle Academy
  - tcg_pocket
  - downstream references and blast radius
