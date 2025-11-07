This directory contains the local Supabase migrations used by the CLI to
determine which versions are present locally vs. on the remote project.

Some files here are `*_baseline_stub.sql` no-op stubs. These stubs mirror
remote-only migration versions (including duplicates like `20251022`) so that
the local list matches the remote history. This prevents `supabase db push`
and `supabase db pull` from failing due to drift and avoids repair loops.

Notes
- The stub files do not execute any SQL. They simply provide filenames with
  version prefixes that match the remote history, making Local == Remote.
- If a schema change was applied manually (e.g., via the SQL editor), a stub
  may be used locally to reflect that the version exists, while leaving the DB
  unchanged.
- It is safe to add or re-run additional stubs if new remote-only versions
  appear (e.g., after a separate environment applied migrations).

Workflow
1) To align local with remote, run:
   `powershell -ExecutionPolicy Bypass -File scripts/tools/align_migrations.ps1`
   Optionally add `-AlsoStubV2` to ensure the `2025110212*` versions exist
   locally if you applied the schema manually.

2) Verify with `supabase migration list` — Local and Remote columns should
   list the same version prefixes (duplicates covered by multiple local files).

3) After alignment, use `supabase db push` as usual for new migrations.

