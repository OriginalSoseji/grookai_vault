# Grookai Vault — Migrations Policy

- Remote is the source of truth. Prefer **remote repair** over adding local stubs.
- If CLI shows “Remote migration versions not found in local migrations”:
  1) `supabase migration repair --status reverted <ids...>`
  2) `supabase db pull`
  3) `supabase db push`
- Do not add new `*_stub.sql` files; any old ones live under `_archive_local/stubs/`.
- Never reuse timestamps from quarantined migrations (e.g., `20251103`).
- Migration order: base tables → derived objects (views/mviews/functions) → RLS/policies.

